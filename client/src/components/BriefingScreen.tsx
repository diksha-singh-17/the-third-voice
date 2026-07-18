import { useState } from 'react';
import type { Scenario } from '../types';

type BriefingScreenProps = {
  scenario: Scenario;
  onContinue: () => void;
  onBack: () => void;
};

export function BriefingScreen({ scenario, onContinue, onBack }: BriefingScreenProps) {
  const [judge, setJudge] = useState(false);
  const [seen, setSeen] = useState<boolean[]>([false, false]);

  const cards = scenario.participants.map((person, index) => ({
    person,
    nudge: index
      ? scenario.pre_conversation_briefing.participant_b_sees
      : scenario.pre_conversation_briefing.participant_a_sees,
  }));

  const canContinue = judge || seen.every(Boolean);

  return (
    <main className="page">
      <header className="topbar">
        <button className="back" onClick={onBack}>
          ← Scenarios
        </button>
        <div className="brand">
          THE THIRD <b>VOICE</b>
        </div>
        <label className="switch">
          Judge view
          <input
            type="checkbox"
            checked={judge}
            onChange={(event) => setJudge(event.target.checked)}
          />
          <span />
        </label>
      </header>
      <section className="briefing">
        <div className="eyebrow">PRIVATE PRE-CONVERSATION BRIEFING</div>
        <h1>
          Enter with a little more <em>clarity.</em>
        </h1>
        <p>Each person receives a private, evidence-informed nudge before the conversation begins.</p>
        <div className="brief-grid">
          {cards.map(({ person, nudge }, index) => {
            const revealed = judge || seen[index];
            return (
              <article
                className={'brief-card' + (revealed ? ' revealed' : '')}
                key={person.name}
              >
                <div className="person">
                  <b>{person.avatar_initial}</b>
                  <div>
                    <strong>{person.name}</strong>
                    <span>{person.role}</span>
                  </div>
                  <small>PRIVATE</small>
                </div>
                {revealed ? (
                  <>
                    <div className="nudge">
                      <span>✦ MEDIATOR NOTE</span>
                      <p>{nudge}</p>
                    </div>
                    <details>
                      <summary>
                        Background evidence <i>⌄</i>
                      </summary>
                      <div>
                        {scenario.background_log_entries
                          .filter((entry) => entry.participant === person.name)
                          .map((entry) => (
                            <p key={entry.date}>
                              <b>{entry.date}</b> {entry.note}
                            </p>
                          ))}
                        {scenario.activity_signals
                          .filter((entry) => entry.participant === person.name)
                          .map((entry) => (
                            <p key={entry.signal}>• {entry.signal}</p>
                          ))}
                      </div>
                    </details>
                  </>
                ) : (
                  <button
                    className="reveal"
                    onClick={() =>
                      setSeen((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? true : value,
                        ),
                      )
                    }
                  >
                    View {person.name}&apos;s private briefing
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <button className="primary" disabled={!canContinue} onClick={onContinue}>
          Continue to conversation <i>→</i>
        </button>
        {!canContinue && <small className="hint">View both briefings to continue</small>}
      </section>
    </main>
  );
}
