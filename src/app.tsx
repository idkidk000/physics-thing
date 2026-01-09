import { useEffect, useRef, useState } from 'react';
import { Canvas, useCanvas } from '@/hooks/canvas';
import { useConfig } from '@/hooks/config';
import { useEvent } from '@/hooks/event';
import { useSimulation } from '@/hooks/simulation';
import { Point, type PointLike } from '@/lib/2d';

function initCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): { bounds: PointLike; position: PointLike } {
  const rect = canvas.getBoundingClientRect();
  const bounds = Point.round({ x: rect.width, y: rect.height });
  canvas.width = bounds.x;
  canvas.height = bounds.y;
  context.clearRect(0, 0, bounds.x, bounds.y);
  return {
    bounds,
    position: Point.round({ x: rect.left, y: rect.top }),
  };
}

export default function App() {
  const [reload, setReload] = useState(0);
  const { configRef, setConfig } = useConfig();
  const { canvasRef } = useCanvas();
  const { eventRef } = useEvent();
  const { simulationRef } = useSimulation();
  const stepState = useRef({ prev: 0, allowOne: false });

  // biome-ignore lint/correctness/useExhaustiveDependencies(reload): deliberate
  useEffect(() => {
    if (!canvasRef.current) throw new Error('oh no');
    const context = canvasRef.current.getContext('2d');
    if (!context) throw new Error('oh no');
    const controller = new AbortController();

    eventRef.current.subscribe('reload', () => setReload(Math.random()), controller.signal);
    // biome-ignore format: no
    eventRef.current.subscribe('step', () => {
      if (!configRef.current.paused) setConfig((prev) => ({ ...prev, paused: true }));
      stepState.current.allowOne = true;
    }, controller.signal );

    function step(time: number) {
      if (!controller.signal.aborted) requestAnimationFrame(step);
      if (!canvasRef.current || !context) throw new Error('oh no');

      const timeDelta = Math.min(100, stepState.current.prev ? time - stepState.current.prev : 0);
      stepState.current.prev = time;

      if (configRef.current.paused && !stepState.current.allowOne) return;
      stepState.current.allowOne = false;

      const { bounds, position } = initCanvas(canvasRef.current, context);
      simulationRef.current.step(bounds, position, timeDelta);

      for (const item of simulationRef.current.objects) item.draw(context);
    }

    requestAnimationFrame(step);

    return () => controller.abort();
  }, [reload]);

  return <Canvas />;
}
