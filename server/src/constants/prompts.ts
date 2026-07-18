export const SCENARIO_JSON_SHAPE = `{"scenario_title":string,"participants":[{"name":string,"role":string,"avatar_initial":string}],"background_log_entries":[{"participant":string,"date":string,"note":string,"tone":string}],"activity_signals":[{"participant":string,"signal":string}],"pre_conversation_briefing":{"participant_a_sees":string,"participant_b_sees":string},"scripted_conversation":[{"speaker":string,"message":string}],"follow_up":{"commitment":string,"success_note":string,"stalled_note":string}}`;

export const DECISION_JSON_SHAPE = `{"should_intervene":boolean,"reasoning":string,"message":string|null,"intervention_type":"fact_check"|"reframe_deadlock"|"surface_context"|"de_escalate"|"escalate_flag"|null}`;

const SCENARIO_GENERATION_STRICT_SUFFIX = '\nRespond with ONLY valid JSON. This is a strict requirement.';

export function buildScenarioGenerationPrompt(description: string, strict = false): string {
  return `A user has described a real or hypothetical workplace situation. Structure it into a scenario for a workplace-conversation simulator.

Infer two participants with plausible names and roles (default manager and employee); a short first-person private background note for EACH participant with a plausible tone; 1–2 concrete activity signals per participant; a 1–2 sentence private briefing for each; a realistic 4–6 line opening exchange; and a follow-up commitment with happened/stalled notes. Be fair to both sides. If the description suggests disrespect, harassment, or power-imbalance mistreatment, represent it honestly and note that escalation beyond peer mediation may be needed.

User description:
${description}

Respond ONLY with valid JSON matching exactly this shape, no markdown fences or other text:
${SCENARIO_JSON_SHAPE}${strict ? SCENARIO_GENERATION_STRICT_SUFFIX : ''}`;
}

export function buildMediatorDecisionPrompt(context: string, conversation: string): string {
  return `You are a neutral, low-key third voice AI observing a live 1:1 conversation between a manager and an employee. Decide after EACH new message whether to speak or stay completely silent.

ONLY interject when: a final dismissal could be reopened by concrete evidence or an alternative path; a claim contradicts background evidence; a vague non-answer repeats a documented pattern; emotion or blame needs a brief de-escalation; or disrespectful/demeaning language is directed at someone. For disrespect, use escalate_flag and calmly name the crossed line without blaming the recipient.

Silence is the default. Stay silent when people are making progress or asking real questions. If you interject, use 1–2 short, neutral sentences framed as a question or concrete next step, never a verdict.

Background context (private; do not quote unnecessarily):
${context}

Conversation so far:
${conversation}

Respond ONLY valid JSON: ${DECISION_JSON_SHAPE}`;
}
