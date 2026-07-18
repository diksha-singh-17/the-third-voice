type ScriptedModeControlsProps = {
  onNext: () => void;
  done: boolean;
  busy?: boolean;
  index: number;
  total: number;
};

export function ScriptedModeControls({
  onNext,
  done,
  busy = false,
  index,
  total,
}: ScriptedModeControlsProps) {
  return (
    <div className="script-controls">
      <span>Scripted demo · {index} / {total}</span>
      <button className="primary" disabled={done || busy} onClick={onNext}>
        {done ? 'Script complete' : busy ? 'Waiting for AI' : 'Play next line'}{' '}
        <i>{busy ? '…' : '→'}</i>
      </button>
    </div>
  );
}
