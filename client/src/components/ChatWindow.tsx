import { useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Decision, Escalation, Message, Scenario } from '../types';
import { createSocket } from '../socket';
import { MessageBubble } from './MessageBubble';
import { MediatorCard } from './MediatorCard';
import { DebugPanel } from './DebugPanel';
import { ScriptedModeControls } from './ScriptedModeControls';

let socket: Socket | null = null;

type ChatWindowProps = {
  scenario: Scenario;
  onFinish: () => void;
  onBack: () => void;
};

export function ChatWindow({ scenario, onFinish, onBack }: ChatWindowProps) {
  const [mode, setMode] = useState<'scripted' | 'live'>('scripted');
  const [messages, setMessages] = useState<Message[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [listening, setListening] = useState(false);
  const [debug, setDebug] = useState(true);
  const [line, setLine] = useState(0);
  const [input, setInput] = useState('');
  const [speaker, setSpeaker] = useState(scenario.participants[0].name);
  const session = useRef(`${scenario.id}-demo`);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket = createSocket();
    socket.emit(
      'join-session',
      { sessionId: session.current, scenarioId: scenario.id, scenario },
      (data: any) => {
        if (data?.messages) setMessages(data.messages);
        if (data?.decisions) setDecisions(data.decisions);
        if (data?.escalation_log) setEscalations(data.escalation_log);
      },
    );

    socket.on('message', (message: Message) => {
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
    });
    socket.on('message-tone', ({ id, tone }) => {
      setMessages((current) =>
        current.map((message) => (message.id === id ? { ...message, tone } : message)),
      );
    });
    socket.on('decision', (decision: Decision) => {
      setDecisions((current) => [...current, decision]);
    });
    socket.on('escalation-log', (entry: Escalation) => {
      setEscalations((current) => [...current, entry]);
    });
    socket.on('mediator-status', setListening);

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [scenario]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, listening]);

  const interventions = useMemo(
    () =>
      decisions.filter(
        (decision) => decision.entry_type !== 'self_check' && decision.should_intervene,
      ),
    [decisions],
  );

  const renderedMessages = useMemo(() => {
    let interventionIndex = 0;
    return messages.map((message) => {
      if (message.kind === 'mediator') {
        const confidence = interventions[interventionIndex++]?.confidence;
        return { message, confidence };
      }
      return { message, confidence: undefined as undefined };
    });
  }, [messages, interventions]);

  const send = (message: string, forcedSpeaker?: string) => {
    if (!message.trim() || listening) return;
    setListening(true);
    socket?.emit('human-message', {
      sessionId: session.current,
      speaker: forcedSpeaker || speaker,
      message,
    });
    setInput('');
  };

  const next = () => {
    if (listening) return;
    const item = scenario.scripted_conversation[line];
    if (!item) return;
    send(item.message, item.speaker);
    setLine((current) => current + 1);
  };

  const exportEscalations = () => {
    const lines = [
      '# Escalation summary',
      '',
      `Conversation participants: ${scenario.participants.map((person) => person.name).join(', ')}`,
      '',
      'This summary records concerns that were flagged for escalation rather than peer-to-peer resolution.',
      '',
    ];

    escalations.forEach((entry, index) => {
      lines.push(
        `## Flag ${index + 1}`,
        `**When:** ${new Date(entry.at).toLocaleString()}`,
        `**What was said by ${entry.speaker}:** “${entry.triggering_message}”`,
        `**Why it was flagged:** ${entry.reason}`,
        'This concern was not treated as something to resolve through peer mediation.',
        '',
      );
    });

    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'third-voice-escalation-summary.md';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const scriptDone = line >= scenario.scripted_conversation.length;

  return (
    <main className="chat-page">
      <header className="topbar">
        <button className="back" onClick={onBack}>
          ← Briefing
        </button>
        <div className="brand">
          THE THIRD <b>VOICE</b>
        </div>
        <button className="judge-btn" onClick={() => setDebug((value) => !value)}>
          {debug ? 'Hide judge' : '☷ Judge view'}
        </button>
      </header>
      <section className="chat-layout">
        <div className="chat-shell">
          <div className="chat-head">
            <div>
              <span className="eyebrow">LIVE CONVERSATION</span>
              <h2>{scenario.scenario_title}</h2>
              <p>{scenario.participants.map((person) => person.name).join('  ·  ')}</p>
            </div>
            <div className="mode">
              <button
                className={mode === 'scripted' ? 'active' : ''}
                onClick={() => setMode('scripted')}
              >
                Scripted
              </button>
              <button
                className={mode === 'live' ? 'active' : ''}
                onClick={() => setMode('live')}
              >
                Live mode
              </button>
            </div>
          </div>

          <div className="messages">
            {messages.length === 0 && (
              <div className="start-state">
                <span>✦</span>
                <h3>The room is ready.</h3>
                <p>
                  {mode === 'scripted'
                    ? 'Play the first line when you’re ready.'
                    : 'Choose a speaker and start the conversation.'}
                </p>
              </div>
            )}
            {renderedMessages.map(({ message, confidence }) =>
              message.kind === 'mediator' ? (
                <MediatorCard key={message.id} message={message} confidence={confidence} />
              ) : (
                <MessageBubble
                  key={message.id}
                  message={message}
                  own={message.speaker === scenario.participants[0].name}
                />
              ),
            )}
            {listening && (
              <div className="listening">
                <span>✦</span> The Third Voice is listening
                <span className="dots">...</span>
              </div>
            )}
            <div ref={end} />
          </div>

          {escalations.length > 0 && (
            <button className="export-escalation" onClick={exportEscalations}>
              ⇩ Export escalation summary
            </button>
          )}

          {mode === 'scripted' ? (
            <ScriptedModeControls
              onNext={next}
              done={scriptDone}
              busy={listening}
              index={line}
              total={scenario.scripted_conversation.length}
            />
          ) : (
            <form
              className={'live-input' + (listening ? ' busy' : '')}
              onSubmit={(event) => {
                event.preventDefault();
                if (!listening) send(input);
              }}
            >
              <select
                value={speaker}
                disabled={listening}
                onChange={(event) => setSpeaker(event.target.value)}
              >
                {scenario.participants.map((person) => (
                  <option key={person.name}>{person.name}</option>
                ))}
              </select>
              <input
                value={input}
                disabled={listening}
                onChange={(event) => setInput(event.target.value)}
                placeholder={listening ? 'Waiting for the Third Voice…' : 'Write a message…'}
              />
              <button type="submit" aria-label="Send" disabled={listening || !input.trim()}>
                ↑
              </button>
            </form>
          )}

          {scriptDone && mode === 'scripted' && !listening && (
            <button className="finish" onClick={onFinish}>
              View one-week follow-up →
            </button>
          )}
        </div>
        <DebugPanel
          open={debug}
          onClose={() => setDebug(false)}
          decisions={decisions}
        />
      </section>
    </main>
  );
}
