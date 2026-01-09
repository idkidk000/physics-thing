import { createContext, type ReactNode, type RefObject, useContext, useEffect, useMemo, useRef } from 'react';
import { useCanvas } from '@/hooks/canvas';
import { useConfig } from '@/hooks/config';
import { useEvent } from '@/hooks/event';
import { Simulation } from '@/lib/simulation';

type Context = {
  simulationRef: RefObject<Simulation>;
};

const Context = createContext<Context | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { eventRef } = useEvent();
  const { configRef } = useConfig();
  const { canvasRef, mouseRef } = useCanvas();
  const simulationRef = useRef<Simulation>(null);

  useEffect(() => {
    simulationRef.current = new Simulation(eventRef.current, configRef, mouseRef, canvasRef);
    return () => simulationRef.current?.destructor();
  }, []);

  const value: Context = useMemo(() => ({ simulationRef: simulationRef as RefObject<Simulation> }), []);

  return <Context value={value}>{children}</Context>;
}

export function useSimulation() {
  const context = useContext(Context);
  if (!context) throw new Error('useSimulation must be used underneath a SimulationProvider');
  return context;
}
