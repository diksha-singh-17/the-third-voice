import { useEffect, useState } from 'react';
import type { Scenario } from './types';
import { ScenarioPicker } from './components/ScenarioPicker';
import { BriefingScreen } from './components/BriefingScreen';
import { ChatWindow } from './components/ChatWindow';
import { FollowUpScreen } from './components/FollowUpScreen';
import { CreateScenarioScreen } from './components/CreateScenarioScreen';
import { ScenarioReviewScreen } from './components/ScenarioReviewScreen';

export function App() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [screen, setScreen] = useState<'pick' | 'create' | 'review' | 'brief' | 'chat' | 'follow'>('pick');
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadAppData() {
      try {
        const [scenarioResponse, healthResponse] = await Promise.all([fetch('/api/scenarios'), fetch('/api/health')]);
        const [scenarioData, healthData] = await Promise.all([scenarioResponse.json(), healthResponse.json()]);
        if (active) { setScenarios(scenarioData); setConfigured(healthData.anthropicConfigured); }
      } catch { if (active) setConfigured(false); }
    }
    void loadAppData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const labels: Record<typeof screen, string> = { pick: 'The Third Voice', create: 'The Third Voice — Create a Scenario', review: 'The Third Voice — Review Scenario', brief: 'The Third Voice — Private Briefing', chat: 'The Third Voice — Live Conversation', follow: 'The Third Voice — Follow-up' };
    document.title = labels[screen];
  }, [screen]);

  const start = (selected: Scenario) => { setScenario(selected); setScreen('brief'); };
  const reset = () => { setScenario(null); setScreen('pick'); };
  if (screen === 'create') return <CreateScenarioScreen onBack={reset} onGenerated={(created) => { setScenario(created); setScreen('review'); }} />;
  if (screen === 'review' && scenario) return <ScenarioReviewScreen key={scenario.id} scenario={scenario} description={scenario.description || ''} onBack={() => setScreen('create')} onRegenerate={async (description) => { const response = await fetch('/api/scenarios/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setScenario({ ...data, id: `custom-${crypto.randomUUID()}`, description }); }} onContinue={(approved) => { setScenario(approved); setScreen('brief'); }} />;
  if (!scenario) return <><>{!configured && <div className="api-warning">Anthropic API key missing — add <code>ANTHROPIC_API_KEY</code> to <code>.env</code> before generating or mediating a conversation.</div>}</><ScenarioPicker scenarios={scenarios} onStart={start} onCreate={() => setScreen('create')} /></>;
  return <>{!configured && <div className="api-warning">The Third Voice is in observation-only mode: add <code>ANTHROPIC_API_KEY</code> to <code>.env</code> to enable AI decisions.</div>}{screen === 'brief' && <BriefingScreen scenario={scenario} onBack={reset} onContinue={() => setScreen('chat')} />}{screen === 'chat' && <ChatWindow scenario={scenario} onBack={() => setScreen('brief')} onFinish={() => setScreen('follow')} />}{screen === 'follow' && <FollowUpScreen scenario={scenario} onRestart={reset} />}</>;
}
