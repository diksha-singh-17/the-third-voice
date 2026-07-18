export type Participant = { name: string; role: string; avatar_initial: string };
export type Scenario = { id: string; scenario_title: string; description?: string; participants: Participant[]; background_log_entries: {participant:string;date:string;note:string;tone:string}[]; activity_signals: {participant:string;signal:string}[]; pre_conversation_briefing: {participant_a_sees:string;participant_b_sees:string}; scripted_conversation: {speaker:string;message:string}[]; follow_up:{commitment:string;success_note:string;stalled_note:string} };
export type Message = { id:string; speaker:string; message:string; at:string; kind:'human'|'mediator' };
export type Decision = { turn:number; speaker:string; should_intervene:boolean; reasoning:string; intervention_type:string|null };
