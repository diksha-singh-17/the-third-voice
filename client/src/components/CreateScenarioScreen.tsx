import { useEffect, useState } from 'react';
import type { Scenario } from '../types';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type CreateScenarioScreenProps = {
  onBack: () => void;
  onGenerated: (scenario: Scenario, description: string) => void;
};

export function CreateScenarioScreen({ onBack, onGenerated }: CreateScenarioScreenProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const Constructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Constructor) return;

    const instance: SpeechRecognitionLike = new Constructor();
    instance.continuous = true;
    instance.interimResults = false;
    instance.lang = 'en-US';
    instance.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result: any) => result[0].transcript)
        .join(' ');
      setDescription((value) => `${value}${value ? ' ' : ''}${transcript}`);
    };
    instance.onend = () => setRecording(false);
    instance.onerror = () => {
      setRecording(false);
      setError('Voice input stopped. You can continue typing your description.');
    };
    setRecognition(instance);

    return () => instance.stop();
  }, []);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/scenarios/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onGenerated(
        { ...data, id: `custom-${crypto.randomUUID()}`, description },
        description,
      );
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (!recognition) return;
    if (recording) {
      recognition.stop();
      setRecording(false);
      return;
    }
    setError('');
    recognition.start();
    setRecording(true);
  };

  return (
    <main className="page">
      <header className="topbar">
        <button className="back" onClick={onBack}>
          ← Scenarios
        </button>
        <div className="brand">
          THE THIRD <b>VOICE</b>
        </div>
        <span />
      </header>
      <section className="create">
        <div className="eyebrow">CREATE YOUR OWN SCENARIO</div>
        <h1>
          Start with what’s <em>actually happening.</em>
        </h1>
        <p>
          Write the situation in your own words. The Third Voice will turn it into a balanced,
          editable conversation setup.
        </p>
        <div className="scenario-input">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe a workplace situation in your own words — e.g. ‘My teammate keeps missing standup because she says she’s overwhelmed with onboarding the new intern, but I think she’s also just distracted lately.’"
          />
          {recognition && (
            <button
              className={'voice-input' + (recording ? ' recording' : '')}
              type="button"
              aria-label={recording ? 'Stop voice input' : 'Start voice input'}
              onClick={toggleRecording}
            >
              {recording ? '■ Stop listening' : '◉ Dictate'}
            </button>
          )}
        </div>
        <div className="create-footer">
          <small>{description.length}/20 minimum characters</small>
          <button
            className="primary"
            disabled={description.trim().length < 20 || loading}
            onClick={generate}
          >
            {loading ? 'Structuring your scenario…' : 'Generate scenario'}{' '}
            <i>{loading ? '…' : '→'}</i>
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </section>
    </main>
  );
}
