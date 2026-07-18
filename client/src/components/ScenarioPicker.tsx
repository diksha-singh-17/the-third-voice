import type { Scenario } from '../types';

const icons = ['↗', '◷', '✦'];

type ScenarioPickerProps = {
  scenarios: Scenario[];
  onStart: (scenario: Scenario) => void;
  onCreate: () => void;
};

export function ScenarioPicker({ scenarios, onStart, onCreate }: ScenarioPickerProps) {
  return (
    <main className="landing">
      <div className="eyebrow">CONVERSATION INTELLIGENCE</div>
      <h1>
        Make room for
        <br />
        <em>better conversations.</em>
      </h1>
      <p className="intro">
        The Third Voice listens quietly to workplace conversations—stepping in only when a gentle
        reframe can help.
      </p>
      <div className="scenario-grid">
        {scenarios.map((scenario, index) => (
          <article className="scenario-card" key={scenario.id}>
            <div className="scenario-icon">{icons[index]}</div>
            <span>SCENARIO 0{index + 1}</span>
            <h2>{scenario.scenario_title.replace('The ', '')}</h2>
            <p>{scenario.description}</p>
            <div className="people">
              {scenario.participants.map((person) => (
                <div key={person.name}>
                  <b>{person.avatar_initial}</b>
                  {person.name}
                  <small>{person.role}</small>
                </div>
              ))}
            </div>
            <button onClick={() => onStart(scenario)}>
              Start demo <i>→</i>
            </button>
          </article>
        ))}
        <article className="scenario-card custom-card">
          <div className="scenario-icon">＋</div>
          <span>YOUR SITUATION</span>
          <h2>Create your own</h2>
          <p>
            Describe a real workplace conversation and let the Third Voice structure a fair,
            editable scenario.
          </p>
          <div className="custom-mark">✦ Made for your context</div>
          <button onClick={onCreate}>
            Create scenario <i>→</i>
          </button>
        </article>
      </div>
    </main>
  );
}
