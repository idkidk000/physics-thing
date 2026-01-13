import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@/hooks/canvas';
import { useConfig } from '@/hooks/config';
import { useEvent } from '@/hooks/event';
import { useSimulation } from '@/hooks/simulation';

export default function App() {
  const [reload, setReload] = useState(0);
  const { configRef, setConfig } = useConfig();
  const { eventRef } = useEvent();
  const { simulationRef } = useSimulation();
  const stepState = useRef({ prev: 0, allowOne: false });

  // biome-ignore lint/correctness/useExhaustiveDependencies(reload): deliberate
  useEffect(() => {
    const controller = new AbortController();

    eventRef.current.subscribe('reload', () => setReload(Math.random()), controller.signal);
    // biome-ignore format: no
    eventRef.current.subscribe('step', () => {
      if (!configRef.current.paused) setConfig((prev) => ({ ...prev, paused: true }));
      stepState.current.allowOne = true;
    }, controller.signal );

    function step(time: number) {
      const timeDelta = Math.min(100, stepState.current.prev ? time - stepState.current.prev : 0);
      stepState.current.prev = time;
      if (!controller.signal.aborted) requestAnimationFrame(step);

      if (configRef.current.paused && !stepState.current.allowOne) return;
      stepState.current.allowOne = false;

      try {
        simulationRef.current.step(timeDelta);
        simulationRef.current.draw();
      } catch (err) {
        controller.abort();
        throw err;
      }
    }

    requestAnimationFrame(step);

    return () => controller.abort();
  }, [reload]);

  return <Canvas />;
}
