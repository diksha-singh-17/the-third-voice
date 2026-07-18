import { useState } from 'react';
import type { Scenario } from '../types';

type ScenarioReviewScreenProps = {
  scenario: Scenario;
  description: string;
  onBack: () => void;
  onRegenerate: (description: string) => Promise<void>;
  onContinue: (scenario: Scenario) => void;
};

export function ScenarioReviewScreen({
  scenario,
  description,
  onBack,
  onRegenerate,
  onContinue,
}: ScenarioReviewScreenProps) {
  const [draft, setDraft] = useState(scenario);
  const [regenerating, setRegenerating] = useState(false);

  const update = <K extends keyof Scenario>(key: K, value: Scenario[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateParticipant = (index: number, key: 'name' | 'role', value: string) => {
    update(
      'participants',
      draft.participants.map((person, personIndex) =>
        personIndex === index
          ? {
              ...person,
              [key]: value,
              avatar_initial:
                key === 'name' ? value[0]?.toUpperCase() || 'P' : person.avatar_initial,
            }
          : person,
      ),
    );
  };

  const updateBackground = (index: number, value: string) => {
    update(
      'background_log_entries',
      draft.background_log_entries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, note: value } : entry,
      ),
    );
  };

  const updateSignal = (index: number, value: string) => {
    update(
      'activity_signals',
      draft.activity_signals.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, signal: value } : entry,
      ),
    );
  };

  const updateScript = (index: number, key: 'speaker' | 'message', value: string) => {
    update(
      'scripted_conversation',
      draft.scripted_conversation.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    );
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate(description);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <main className="page">
      <header className="topbar">
        <button className="back" onClick={onBack}>
          ← Describe scenario
        </button>
        <div className="brand">
          THE THIRD <b>VOICE</b>
        </div>
        <span />
      </header>
      <section className="review">
        <div className="eyebrow">REVIEW BEFORE SHARING</div>
        <h1>
          Make it <em>yours.</em>
        </h1>
        <p>Review and adjust the generated context before either participant sees it.</p>
        <div className="review-card">
          <label>
            Scenario title
            <input
              value={draft.scenario_title}
              onChange={(event) => update('scenario_title', event.target.value)}
            />
          </label>

          <h3>Participants</h3>
          <div className="two-inputs">
            {draft.participants.map((person, index) => (
              <div key={index}>
                <label>
                  Name
                  <input
                    value={person.name}
                    onChange={(event) =>
                      updateParticipant(index, 'name', event.target.value)
                    }
                  />
                </label>
                <label>
                  Role
                  <input
                    value={person.role}
                    onChange={(event) =>
                      updateParticipant(index, 'role', event.target.value)
                    }
                  />
                </label>
              </div>
            ))}
          </div>

          <h3>Background notes</h3>
          {draft.background_log_entries.map((entry, index) => (
            <label key={index}>
              {entry.participant}
              <textarea
                value={entry.note}
                onChange={(event) => updateBackground(index, event.target.value)}
              />
            </label>
          ))}

          <h3>Activity signals</h3>
          {draft.activity_signals.map((entry, index) => (
            <label key={index}>
              <input
                value={entry.signal}
                onChange={(event) => updateSignal(index, event.target.value)}
              />
            </label>
          ))}

          <h3>Private briefings</h3>
          <label>
            Participant one
            <textarea
              value={draft.pre_conversation_briefing.participant_a_sees}
              onChange={(event) =>
                update('pre_conversation_briefing', {
                  ...draft.pre_conversation_briefing,
                  participant_a_sees: event.target.value,
                })
              }
            />
          </label>
          <label>
            Participant two
            <textarea
              value={draft.pre_conversation_briefing.participant_b_sees}
              onChange={(event) =>
                update('pre_conversation_briefing', {
                  ...draft.pre_conversation_briefing,
                  participant_b_sees: event.target.value,
                })
              }
            />
          </label>

          <h3>Opening conversation</h3>
          {draft.scripted_conversation.map((line, index) => (
            <div className="script-edit" key={index}>
              <input
                value={line.speaker}
                onChange={(event) => updateScript(index, 'speaker', event.target.value)}
              />
              <textarea
                value={line.message}
                onChange={(event) => updateScript(index, 'message', event.target.value)}
              />
              <button
                type="button"
                onClick={() =>
                  update(
                    'scripted_conversation',
                    draft.scripted_conversation.filter(
                      (_, lineIndex) => lineIndex !== index,
                    ),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="add-line"
            type="button"
            onClick={() =>
              update('scripted_conversation', [
                ...draft.scripted_conversation,
                { speaker: draft.participants[0].name, message: '' },
              ])
            }
          >
            + Add line
          </button>

          <h3>Follow-up</h3>
          <label>
            Commitment
            <textarea
              value={draft.follow_up.commitment}
              onChange={(event) =>
                update('follow_up', {
                  ...draft.follow_up,
                  commitment: event.target.value,
                })
              }
            />
          </label>
          <label>
            It happened
            <input
              value={draft.follow_up.success_note}
              onChange={(event) =>
                update('follow_up', {
                  ...draft.follow_up,
                  success_note: event.target.value,
                })
              }
            />
          </label>
          <label>
            It stalled
            <input
              value={draft.follow_up.stalled_note}
              onChange={(event) =>
                update('follow_up', {
                  ...draft.follow_up,
                  stalled_note: event.target.value,
                })
              }
            />
          </label>
        </div>
        <div className="review-actions">
          <button className="secondary" disabled={regenerating} onClick={regenerate}>
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
          <button className="primary" onClick={() => onContinue(draft)}>
            Looks good, continue <i>→</i>
          </button>
        </div>
      </section>
    </main>
  );
}
