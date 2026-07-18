import Anthropic from '@anthropic-ai/sdk';
import type { Decision } from '../types/index.js';
import { buildMediatorDecisionPrompt, buildScenarioGenerationPrompt } from '../constants/prompts.js';

const validTypes = new Set(['fact_check', 'reframe_deadlock', 'surface_context', 'de_escalate', 'escalate_flag']);
const silent = (reasoning: string): Decision => ({ should_intervene: false, reasoning, message: null, intervention_type: null });

function parseScenario(text: string) {
  const value = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim());
  if (!value?.scenario_title || !Array.isArray(value.participants) || value.participants.length !== 2 || !Array.isArray(value.background_log_entries) || !Array.isArray(value.activity_signals) || !value.pre_conversation_briefing || !Array.isArray(value.scripted_conversation) || !value.follow_up) throw new Error('Response did not match the scenario format');
  value.participants = value.participants.slice(0, 2).map((p: any) => ({ name: String(p.name || 'Participant'), role: String(p.role || 'employee'), avatar_initial: String(p.avatar_initial || p.name?.[0] || 'P').slice(0, 1).toUpperCase() }));
  return value;
}

export async function generateScenario(description: string) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is missing. Add it to .env before generating a custom scenario.');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1800, messages: [{ role: 'user', content: buildScenarioGenerationPrompt(description, attempt === 1) }] });
      const text = response.content.find((block) => block.type === 'text');
      if (!text || text.type !== 'text') throw new Error('No text in model response');
      return parseScenario(text.text);
    } catch (error) { if (attempt === 1) throw error; }
  }
}

export async function decide(scenario: any, history: {speaker:string;message:string}[]): Promise<Decision> {
  if (!process.env.ANTHROPIC_API_KEY) return silent('No API key configured — Third Voice decision skipped.');
  const context = JSON.stringify({ background_log_entries: scenario.background_log_entries, activity_signals: scenario.activity_signals });
  const conversation = history.map((m) => `${m.speaker}: ${m.message}`).join('\n');
  const prompt = buildMediatorDecisionPrompt(context, conversation);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 500, messages: [{ role: 'user', content: prompt }] });
      const raw = response.content.find((block) => block.type === 'text');
      if (!raw || raw.type !== 'text') throw new Error('No text in model response');
      const cleaned = raw.text.replace(/^```json\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.should_intervene !== 'boolean' || typeof parsed.reasoning !== 'string') throw new Error('Invalid decision shape');
      return { should_intervene: parsed.should_intervene, reasoning: parsed.reasoning.slice(0, 800), message: parsed.should_intervene ? String(parsed.message || '').slice(0, 360) : null, intervention_type: validTypes.has(parsed.intervention_type) ? parsed.intervention_type : null };
    } catch (error) { if (attempt === 1) return silent(`Third Voice unavailable — ${error instanceof Error ? error.message : 'unknown error'}`); }
  }
  return silent('Third Voice unavailable.');
}
