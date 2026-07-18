import type { Message } from '../types';

type MessageBubbleProps = {
  message: Message;
  own: boolean;
};

export function MessageBubble({ message, own }: MessageBubbleProps) {
  const tone = message.tone || 'neutral';
  const time = new Date(message.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className={'bubble-row' + (own ? ' own' : '')}>
      <div className="avatar">{message.speaker[0]}</div>
      <div>
        <span className="speaker">{message.speaker}</span>
        <div className="bubble">{message.message}</div>
        <time>
          <i
            className={'tone-dot ' + tone}
            title={message.tone ? `Detected tone: ${message.tone}` : 'Tone is being assessed'}
          />{' '}
          {time}
        </time>
      </div>
    </div>
  );
}
