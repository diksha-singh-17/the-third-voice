import { useEffect, useRef, useState } from 'react';
import type { Scenario } from '../types';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type CreateScenarioScreenProps = {
  onBack: () => void;
  onGenerated: (scenario: Scenario, description: string) => void;
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function CreateScenarioScreen({ onBack, onGenerated }: CreateScenarioScreenProps) {
  const [description, setDescription] = useState('');
  const [interim, setInterim] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const keepListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionConstructor()));
    return () => {
      keepListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const attachAndStart = () => {
    const Constructor = getSpeechRecognitionConstructor();
    if (!Constructor || !keepListeningRef.current || startingRef.current) return;

    clearRestartTimer();

    // Chrome is unreliable when reusing one instance after onend — always create a new one.
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }

    const instance = new Constructor();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = navigator.language || 'en-US';

    instance.onstart = () => {
      // Only the currently active recognition instance may update the UI. An
      // aborted instance can emit late events while a replacement is starting.
      if (recognitionRef.current !== instance) return;
      startingRef.current = false;
      setRecording(true);
      setError('');
    };

    instance.onresult = (event) => {
      if (recognitionRef.current !== instance) return;
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript || '';
        if (result.isFinal) finalChunk += text;
        else interimChunk += text;
      }
      if (finalChunk.trim()) {
        setDescription((value) => `${value}${value ? ' ' : ''}${finalChunk.trim()}`);
      }
      setInterim(interimChunk.trim());
    };

    instance.onerror = (event) => {
      if (recognitionRef.current !== instance) return;
      const code = String(event?.error || '');
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        keepListeningRef.current = false;
        startingRef.current = false;
        setRecording(false);
        setInterim('');
        setError('Microphone or speech-service permission was denied. Allow microphone access in Chrome, then click Dictate again.');
        return;
      }
      if (code === 'audio-capture') {
        keepListeningRef.current = false;
        startingRef.current = false;
        setRecording(false);
        setInterim('');
        setError('No microphone found. Check your input device and try again.');
        return;
      }
      if (code === 'network' || code === 'language-not-supported') {
        keepListeningRef.current = false;
        startingRef.current = false;
        setRecording(false);
        setInterim('');
        setError('Dictation is unavailable in this browser right now. Try Chrome with an internet connection, or type your description instead.');
      }
      // no-speech and aborted can safely restart via onend.
    };

    instance.onend = () => {
      if (recognitionRef.current !== instance) return;
      startingRef.current = false;
      recognitionRef.current = null;
      setInterim('');
      if (!keepListeningRef.current) {
        setRecording(false);
        return;
      }
      // Auto-resume until the user explicitly stops.
      restartTimerRef.current = setTimeout(() => {
        if (keepListeningRef.current) attachAndStart();
      }, 250);
    };

    recognitionRef.current = instance;
    startingRef.current = true;
    try {
      instance.start();
    } catch {
      if (recognitionRef.current === instance) recognitionRef.current = null;
      startingRef.current = false;
      // Retry once shortly if the engine was still winding down.
      restartTimerRef.current = setTimeout(() => {
        if (keepListeningRef.current) attachAndStart();
      }, 350);
    }
  };

  const startRecording = () => {
    if (keepListeningRef.current) return;
    keepListeningRef.current = true;
    setRecording(false);
    setError('');
    attachAndStart();
  };

  const stopRecording = () => {
    keepListeningRef.current = false;
    startingRef.current = false;
    clearRestartTimer();
    setRecording(false);
    setInterim('');
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  };

  const generate = async () => {
    if (recording) stopRecording();
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

  const displayValue = interim
    ? `${description}${description ? ' ' : ''}${interim}`
    : description;

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
            value={displayValue}
            onChange={(event) => {
              setDescription(event.target.value);
              setInterim('');
            }}
            placeholder="Describe a workplace situation in your own words — e.g. ‘My teammate keeps missing standup because she says she’s overwhelmed with onboarding the new intern, but I think she’s also just distracted lately.’"
          />
          {supported ? (
            <div className="voice-actions">
              {!recording ? (
                <button
                  className="voice-input"
                  type="button"
                  aria-label="Start voice input"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    startRecording();
                  }}
                >
                  ◉ Dictate
                </button>
              ) : (
                <button
                  className="voice-input recording"
                  type="button"
                  aria-label="Stop voice input"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    stopRecording();
                  }}
                >
                  ■ Stop listening
                </button>
              )}
            </div>
          ) : (
            <p className="voice-unsupported">
              Voice dictate needs Chrome or Edge with microphone access.
            </p>
          )}
        </div>
        {recording && (
          <p className="voice-status">Listening… keep speaking. Click Stop when you’re done.</p>
        )}
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
