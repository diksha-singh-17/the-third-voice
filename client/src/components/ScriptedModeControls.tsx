type ScriptedModeControlsProps = {
  onNext: () => void;
  done: boolean;
  index: number;
  total: number;
};

export function ScriptedModeControls({ onNext, done, index, total }: ScriptedModeControlsProps) {
  return (
    <div className="script-controls">
      <span>Scripted demo · {index} / {total}</span>
      <button className="primary" disabled={done} onClick={onNext}>
        {done ? 'Script complete' : 'Play next line'} <i>→</i>
      </button>
    </div>
  );
}
