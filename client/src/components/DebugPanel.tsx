import type { Decision } from '../types';

type DebugPanelProps = {
  open: boolean;
  onClose: () => void;
  decisions: Decision[];
};

export function DebugPanel({ open, onClose, decisions }: DebugPanelProps) {
  return (
    <aside className={'debug' + (open ? ' open' : '')}>
      <div className="debug-head">
        <div>
          <span>JUDGE VIEW</span>
          <h3>Decision log</h3>
        </div>
        <button type="button" aria-label="Close judge view" onClick={onClose}>
          ×
        </button>
      </div>
      <p className="debug-intro">
        Every turn is evaluated, including the moments the Third Voice stays quiet.
      </p>
      {decisions.length === 0 ? (
        <div className="empty">Waiting for the first message…</div>
      ) : (
        <div className="decision-list">
          {[...decisions].reverse().map((decision) => {
            const isSelfCheck = decision.entry_type === 'self_check';
            return (
              <article
                className={isSelfCheck ? 'self-check' : ''}
                key={decision.id || `${decision.turn}-${decision.speaker}`}
              >
                <div>
                  <b>
                    {isSelfCheck
                      ? `TURN ${decision.turn} · SELF-CHECK`
                      : `TURN ${decision.turn} · ${decision.speaker}`}
                  </b>
                  <em
                    className={
                      isSelfCheck ? 'flag' : decision.should_intervene ? 'yes' : 'no'
                    }
                  >
                    {isSelfCheck
                      ? 'REVIEW FLAG'
                      : decision.should_intervene
                        ? 'INTERVENED'
                        : 'SILENT'}
                  </em>
                </div>
                <p>{isSelfCheck ? decision.explanation : decision.reasoning}</p>
                {decision.confidence_reason && (
                  <small className="confidence-reason">
                    Confidence: {decision.confidence_reason}
                  </small>
                )}
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}
