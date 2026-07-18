export type Participant = {
  name: string;
  role: string;
  avatar_initial: string;
};

export type Scenario = {
  id: string;
  scenario_title: string;
  description?: string;
  participants: Participant[];
  background_log_entries: { participant: string; date: string; note: string; tone: string }[];
  activity_signals: { participant: string; signal: string }[];
  pre_conversation_briefing: { participant_a_sees: string; participant_b_sees: string };
  scripted_conversation: { speaker: string; message: string }[];
  follow_up: { commitment: string; success_note: string; stalled_note: string };
};

export type Tone = 'neutral' | 'frustrated' | 'anxious' | 'defensive' | 'warm';
export type Confidence = 'high' | 'moderate' | 'worth_verifying';

export type Message = {
  id: string;
  speaker: string;
  message: string;
  at: string;
  kind: 'human' | 'mediator';
  tone?: Tone;
};

export type Decision = {
  id?: string;
  entry_type?: 'decision' | 'self_check';
  turn: number;
  speaker: string;
  should_intervene?: boolean;
  reasoning?: string;
  intervention_type?: string | null;
  detected_tone?: Tone;
  confidence?: Confidence | null;
  confidence_reason?: string | null;
  bias_detected?: boolean;
  explanation?: string | null;
};

export type Escalation = {
  id: string;
  at: string;
  triggering_message: string;
  speaker: string;
  participants: string[];
  reason: string;
};
