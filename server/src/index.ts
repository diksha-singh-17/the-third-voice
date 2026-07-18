import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decide, generateScenario } from './services/llmMediator.js';

const seedDir = join(process.cwd(), 'server', 'seed-data');
const scenarios = readdirSync(seedDir).map((file) => ({ id: file.replace('.json', ''), ...JSON.parse(readFileSync(join(seedDir, file), 'utf8')) }));
const app = express(); app.use(cors()); app.use(express.json());
const httpServer = createServer(app); const io = new Server(httpServer, { cors: { origin: '*' } });
type Session = { scenario:any; messages:any[]; decisions:any[] };
const sessions = new Map<string, Session>();
const makeSession = (id:string, scenarioId:string) => { const scenario = scenarios.find((s) => s.id === scenarioId); if (!scenario) return null; const session = { scenario, messages: [], decisions: [] }; sessions.set(id, session); return session; };
app.get('/api/health', (_req,res) => res.json({ ok:true, anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY) }));
app.get('/api/scenarios', (_req,res) => res.json(scenarios));
app.post('/api/scenarios/generate', async (req, res) => {
  const description = String(req.body?.description || '').trim();
  if (description.length < 20) return res.status(400).json({ error: 'Please add a little more detail (at least 20 characters).' });
  try { res.json(await generateScenario(description)); }
  catch (error) { res.status(422).json({ error: process.env.ANTHROPIC_API_KEY ? "Couldn't structure that scenario — try rephrasing or adding a bit more detail." : error instanceof Error ? error.message : 'Could not generate scenario.' }); }
});
io.on('connection', (socket) => {
  socket.on('join-session', ({sessionId, scenarioId, scenario: suppliedScenario}, ack) => { const session = sessions.get(sessionId) || (suppliedScenario ? (() => { const created = { scenario: suppliedScenario, messages: [], decisions: [] }; sessions.set(sessionId, created); return created; })() : makeSession(sessionId, scenarioId)); if (!session) return ack?.({error:'Scenario not found'}); socket.join(sessionId); ack?.({messages:session.messages, decisions:session.decisions}); });
  socket.on('human-message', async ({sessionId, speaker, message}) => {
    const session = sessions.get(sessionId); if (!session || !message?.trim()) return;
    const human = { id: crypto.randomUUID(), speaker, message: message.trim(), at:new Date().toISOString(), kind:'human' };
    session.messages.push(human); io.to(sessionId).emit('message', human); io.to(sessionId).emit('mediator-status', true);
    const result = await decide(session.scenario, session.messages.filter((m) => m.kind === 'human'));
    const log = { turn: session.messages.filter((m)=>m.kind==='human').length, speaker, ...result }; session.decisions.push(log); io.to(sessionId).emit('decision', log);
    if (result.should_intervene && result.message) { const ai = { id:crypto.randomUUID(), speaker:'Third Voice', message:result.message, at:new Date().toISOString(), kind:'mediator' }; session.messages.push(ai); io.to(sessionId).emit('message', ai); }
    io.to(sessionId).emit('mediator-status', false);
  });
});
httpServer.listen(3001, () => console.log('Third Voice server at http://localhost:3001'));
