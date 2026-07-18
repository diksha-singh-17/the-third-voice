export type Tone = 'neutral' | 'frustrated' | 'anxious' | 'defensive' | 'warm';
export type Confidence = 'high' | 'moderate' | 'worth_verifying';
export type Decision = { should_intervene: boolean; reasoning: string; message: string | null; intervention_type: 'fact_check'|'reframe_deadlock'|'surface_context'|'de_escalate'|'escalate_flag'|null; detected_tone: Tone; confidence: Confidence | null; confidence_reason: string | null };
export type FairnessCheck = { bias_detected: boolean; explanation: string | null };
