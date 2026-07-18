import type { Confidence, Message } from '../types';

const confidenceLabel: Record<Confidence, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  worth_verifying: 'Worth verifying',
};

type MediatorCardProps = {
  message: Message;
  confidence?: Confidence | null;
};

export function MediatorCard({ message, confidence }: MediatorCardProps) {
  return (
    <div className="mediator-card">
      <div>
        <span>✦</span> THIRD VOICE <small>INTERVENTION</small>
        {confidence && (
          <em className={'confidence ' + confidence}>{confidenceLabel[confidence]}</em>
        )}
      </div>
      <p>{message.message}</p>
    </div>
  );
}
