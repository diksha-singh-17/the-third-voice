import { useState } from 'react';
import type { Scenario } from '../types';

type FollowUpScreenProps = {
  scenario: Scenario;
  onRestart: () => void;
};

export function FollowUpScreen({ scenario, onRestart }: FollowUpScreenProps) {
  const [success, setSuccess] = useState(true);

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          THE THIRD <b>VOICE</b>
        </div>
        <button className="back" onClick={onRestart}>
          New scenario
        </button>
      </header>
      <section className="follow">
        <div className="eyebrow">SIMULATED FOLLOW-UP</div>
        <h1>
          One week <em>later.</em>
        </h1>
        <p className="simulated">
          In a real deployment, this would connect to Slack, GitHub, or Jira to verify
          automatically.
        </p>
        <div className="follow-card">
          <span className="label">THE COMMITMENT</span>
          <p>{scenario.follow_up.commitment}</p>
          <div className={'outcome ' + (success ? 'success' : 'stalled')}>
            <span>{success ? '✓' : '!'}</span>
            <div>
              <b>{success ? 'It happened' : 'It stalled'}</b>
              <p>
                {success
                  ? scenario.follow_up.success_note
                  : scenario.follow_up.stalled_note}
              </p>
            </div>
          </div>
          <div className="toggle">
            <button className={success ? 'selected' : ''} onClick={() => setSuccess(true)}>
              ✓ It happened
            </button>
            <button className={!success ? 'selected' : ''} onClick={() => setSuccess(false)}>
              ⚠ It stalled
            </button>
          </div>
        </div>
        <button className="primary" onClick={onRestart}>
          Try another conversation <i>→</i>
        </button>
      </section>
    </main>
  );
}
