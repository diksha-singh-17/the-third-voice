import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Scenario } from '../types';

type SessionContextValue = {
  scenario: Scenario | null;
  setScenario: (scenario: Scenario | null) => void;
};

const SessionContext = createContext<SessionContextValue>({
  scenario: null,
  setScenario: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  return (
    <SessionContext.Provider value={{ scenario, setScenario }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
