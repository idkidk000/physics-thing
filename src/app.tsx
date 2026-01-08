import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Canvas, MouseStateEvent, useCanvas } from '@/hooks/canvas';
import { type Config, useConfig } from '@/hooks/config';
import { useEvent } from '@/hooks/event';
import { Point, type PointLike, Vector } from '@/lib/2d';
import { Circle } from '@/lib/circle';

function createCircle(items: Circle[], config: Config, { x, y }: PointLike, left?: boolean) {
  items.push(
    new Circle(
      new Point(x, y),
      new Vector({
        x: left ? -1 : left === false ? 1 : Math.round(Math.random()) * 2 - 1,
        y: Math.random() - 2,
      }),
      Math.round(Math.random() * (config.radiusMax - config.radiusMin) + config.radiusMin),
      config.hueCenter + (Math.random() - 0.5) * config.hueRange * 2
    )
  );
}

function initCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): { bounds: PointLike; position: PointLike } {
  const rect = canvas.getBoundingClientRect();
  const bounds = Point.round({ x: rect.width, y: rect.height });
  canvas.width = bounds.x;
  canvas.height = bounds.y;
  context.fillStyle = '#000';
  context.fillRect(0, 0, bounds.x, bounds.y);
  return {
    bounds,
    position: Point.round({ x: rect.left, y: rect.top }),
  };
}

export default function App() {
  const [reload, setReload] = useState(0);
  const itemsRef = useRef<Circle[]>([]);
  const activeItemRef = useRef<Circle | null>(null);
  const { configRef, setConfig } = useConfig();
  const { canvasRef, mouseRef } = useCanvas();
  const { eventRef } = useEvent();

  // biome-ignore lint/correctness/useExhaustiveDependencies(reload): deliberate
  useEffect(() => {
    if (!canvasRef.current) throw new Error('oh no');
    const context = canvasRef.current.getContext('2d');
    if (!context) throw new Error('oh no');
    const controller = new AbortController();
    let prevTime = 0;
    const deleteIxs = new Set<number>();

    // biome-ignore format: no
    eventRef.current.subscribe('clear', () => { itemsRef.current = []; }, controller.signal );
    eventRef.current.subscribe('dump', () => console.log(itemsRef.current), controller.signal);
    // biome-ignore format: no
    eventRef.current.subscribe('grow', () => {
      if (activeItemRef.current) ++activeItemRef.current.radius;
      else for (const item of itemsRef.current) ++item.radius;
    }, controller.signal );
    // biome-ignore format: no
    eventRef.current.subscribe( 'immortal', () => {
      if (activeItemRef.current) activeItemRef.current.immortal = !activeItemRef.current.immortal;
      else {
        const immortal = itemsRef.current.at(0)?.immortal;
        for (const item of itemsRef.current) item.immortal = !immortal;
      }
    }, controller.signal );
    eventRef.current.subscribe('pause', () => setConfig((prev) => ({ ...prev, paused: !prev.paused })), controller.signal);
    eventRef.current.subscribe('reload', () => setReload(Math.random()), controller.signal);
    // biome-ignore format: no
    eventRef.current.subscribe('step', () => {
      if (!configRef.current.paused) setConfig((prev) => ({ ...prev, paused: true }));
      step(prevTime + 1000 / 60, true);
    }, controller.signal );

    function step(time: number, force = false) {
      if (!controller.signal.aborted) requestAnimationFrame(step);
      if (configRef.current.paused && !force) return;
      if (!canvasRef.current) throw new Error('oh no');
      if (!context) throw new Error('oh no');
      const timeDelta = Math.min(100, prevTime ? time - prevTime : 0);
      prevTime = time;

      const { bounds, position } = initCanvas(canvasRef.current, context);
      const canvasMouse = Point.sub(mouseRef.current, position);

      if (mouseRef.current.event === MouseStateEvent.End) {
        if (activeItemRef.current) {
          activeItemRef.current.dragging = false;
          activeItemRef.current = null;
        }
        mouseRef.current.event = MouseStateEvent.None;
      } else if (mouseRef.current.event === MouseStateEvent.Start) {
        if (!activeItemRef.current) {
          activeItemRef.current = itemsRef.current.find((item) => item.age > 20 && item.position.hypot2(canvasMouse) < item.radius ** 2) ?? null;
          if (activeItemRef.current) activeItemRef.current.dragging = true;
        }
        mouseRef.current.event = MouseStateEvent.None;
      }
      if (activeItemRef.current) {
        const { x, y } = activeItemRef.current.position;
        activeItemRef.current.position.x = canvasMouse.x;
        activeItemRef.current.position.y = canvasMouse.y;
        activeItemRef.current.velocity.addEq(activeItemRef.current.position.sub({ x, y }).multEq(configRef.current.dragVelocity));
      } else if (mouseRef.current.buttons) {
        const left = mouseRef.current.buttons & 0x1;
        const right = mouseRef.current.buttons & 0x2;
        const direction = left && right ? undefined : left > 0;
        createCircle(itemsRef.current, configRef.current, canvasMouse, direction);
      }

      const physicsMillis = timeDelta / configRef.current.physicsSteps;
      for (let step = 0; step < configRef.current.physicsSteps; ++step) {
        for (const circle of itemsRef.current) circle.step(physicsMillis, bounds);
        // sweep and prune, but with random direction so items aren't pushed to one side
        // https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/23-SAP.html
        // https://youtu.be/euypZDssYxE
        const left = Math.random() > 0.5;
        const sorted = itemsRef.current.toSorted(left ? (a, b) => a.left - b.left : (a, b) => b.right - a.right);
        for (let i = 0; i < sorted.length; ++i) {
          const item = sorted[i];
          for (let o = i + 1; o < sorted.length; ++o) {
            const other = sorted[o];
            if (left && other.left > item.right) break;
            if (!left && other.right < item.left) break;
            item.collide(other);
          }
        }
      }

      for (const [i, item] of itemsRef.current.entries()) {
        if (!item.dragging) ++item.age;
        if (!item.immortal && (item.idle || item.age >= configRef.current.maxAge)) --item.opacity;
        else if (item.opacity < 100) ++item.opacity;
        if (item.opacity === 0) deleteIxs.add(i);
        else item.draw(context);
      }

      if (deleteIxs.size) {
        itemsRef.current = itemsRef.current.filter((_, i) => !deleteIxs.has(i));
        deleteIxs.clear();
      }
    }

    requestAnimationFrame(step);

    return () => controller.abort();
  }, [reload]);

  return (
    <div className='flex flex-col lg:flex-row size-full'>
      <Sidebar className='grid grid-cols-[repeat(auto-fit,minmax(18ch,1fr))] gap-2 p-4 my-auto select-none' />
      <Canvas className='border-4 border-foreground size-full touch-none overflow-hidden' />
    </div>
  );
}
