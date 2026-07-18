import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkFairness, decide, generateScenario } from './services/llmMediator.js';
import { installSlackIntegration } from './services/slackIntegration.js';

const seedDir = join(process.cwd(), 'server', 'seed-data');
const scenarios = readdirSync(seedDir).map((file) => ({ id: file.replace('.json', ''), ...JSON.parse(readFileSync(join(seedDir, file), 'utf8')) }));
const app = express();
const slack = installSlackIntegration(app, scenarios);
app.use(cors()); app.use(express.json());
const httpServer = createServer(app); const io = new Server(httpServer, { cors: { origin: '*' } });
type Session = { scenario:any; messages:any[]; decisions:any[]; escalation_log:any[] };
const sessions = new Map<string, Session>();
const makeSession = (id:string, scenarioId:string) => { const scenario = scenarios.find((s) => s.id === scenarioId); if (!scenario) return null; const session = { scenario, messages: [], decisions: [], escalation_log: [] }; sessions.set(id, session); return session; };
app.get('/api/health', (_req,res) => res.json({ ok:true, anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY), slack }));
app.get('/api/scenarios', (_req,res) => res.json(scenarios));
app.post('/api/scenarios/generate', async (req, res) => {
  const description = String(req.body?.description || '').trim();
  if (description.length < 20) return res.status(400).json({ error: 'Please add a little more detail (at least 20 characters).' });
  try { res.json(await generateScenario(description)); }
  catch (error) { res.status(422).json({ error: process.env.ANTHROPIC_API_KEY ? "Couldn't structure that scenario — try rephrasing or adding a bit more detail." : error instanceof Error ? error.message : 'Could not generate scenario.' }); }
});
io.on('connection', (socket) => {
  socket.on('join-session', ({sessionId, scenarioId, scenario: suppliedScenario}, ack) => { const session = sessions.get(sessionId) || (suppliedScenario ? (() => { const created = { scenario: suppliedScenario, messages: [], decisions: [], escalation_log: [] }; sessions.set(sessionId, created); return created; })() : makeSession(sessionId, scenarioId)); if (!session) return ack?.({error:'Scenario not found'}); socket.join(sessionId); ack?.({messages:session.messages, decisions:session.decisions, escalation_log:session.escalation_log}); });
  socket.on('human-message', async ({sessionId, speaker, message}) => {
    const session = sessions.get(sessionId); if (!session || !message?.trim()) return;
    const human: any = { id: crypto.randomUUID(), speaker, message: message.trim(), at:new Date().toISOString(), kind:'human' };
    session.messages.push(human); io.to(sessionId).emit('message', human); io.to(sessionId).emit('mediator-status', true);
    const result = await decide(session.scenario, session.messages.filter((m) => m.kind === 'human'));
    human.tone = result.detected_tone; io.to(sessionId).emit('message-tone', { id: human.id, tone: human.tone });
    const log = { id: crypto.randomUUID(), entry_type: 'decision', turn: session.messages.filter((m)=>m.kind==='human').length, speaker, ...result }; session.decisions.push(log); io.to(sessionId).emit('decision', log);
    if (result.intervention_type === 'escalate_flag') { const escalation = { id: crypto.randomUUID(), at: human.at, triggering_message: human.message, speaker, participants: session.scenario.participants.map((p:any) => p.name), reason: result.reasoning }; session.escalation_log.push(escalation); io.to(sessionId).emit('escalation-log', escalation); }
    if (result.should_intervene && result.message) { const ai = { id:crypto.randomUUID(), speaker:'Third Voice', message:result.message, at:new Date().toISOString(), kind:'mediator' }; session.messages.push(ai); io.to(sessionId).emit('message', ai); }
    const turns = session.messages.filter((m) => m.kind === 'human').length;
    if (turns % 4 === 0) { const fairness = await checkFairness(session.decisions.filter((d) => d.entry_type === 'decision' && d.should_intervene)); if (fairness?.bias_detected) { const selfCheck = { id: crypto.randomUUID(), entry_type: 'self_check', turn: turns, speaker: 'Third Voice', ...fairness }; session.decisions.push(selfCheck); io.to(sessionId).emit('decision', selfCheck); } }
    io.to(sessionId).emit('mediator-status', false);
  });
});
httpServer.listen(3001, () => {
  console.log('Third Voice server at http://localhost:3001');
  if (slack.enabled) console.log(`Slack Events API enabled at ${slack.endpoint} using ${slack.scenarioId}.`);
});
