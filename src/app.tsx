import { type MouseEvent, type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Point, type PointLike, Vector } from '@/lib/2d';
import { Circle } from '@/lib/circle';

const PHYSICS_STEPS = 5;

function createCircle(items: Circle[], x: number, y: number, left?: boolean) {
  const radius = Math.round(Math.random() * 20 + 10);
  if (items.find((item) => (item.position.x - x) ** 2 + (item.position.y - y) ** 2 <= (item.radius + radius) ** 2)) return;
  items.push(
    new Circle(
      new Point(x, y),
      new Vector({
        x: left ? -1 : left === false ? 1 : Math.round(Math.random()) * 2 - 1,
        y: Math.random() - 2,
      }),
      radius,
      Math.round(Math.random() * 360)
    )
  );
}

function initCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): PointLike {
  const rect = canvas.getBoundingClientRect();
  const round = Point.round({ x: rect.width, y: rect.height });
  canvas.width = round.x;
  canvas.height = round.y;
  context.fillStyle = '#000';
  context.fillRect(0, 0, round.x, round.y);
  return round;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reload, setReload] = useState(0);
  const itemsRef = useRef<Circle[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies(reload): deliberate
  useEffect(() => {
    if (!canvasRef.current) throw new Error('oh no');
    const context = canvasRef.current.getContext('2d');
    if (!context) throw new Error('oh no');
    const controller = new AbortController();
    let prevTime = 0;
    let paused = false;

    // biome-ignore format: no
    document.addEventListener('keydown', (event) => {
      if (event.key === 'r') setReload(Math.random());
      if (event.key === 'd') console.log(itemsRef.current);
      if (event.key === 'c') itemsRef.current = [];
      if (event.key === 's') {
        paused = true;
        step(prevTime + 1, true);
      }
      if (event.key === 'p') {
        paused = !paused;
        if (!paused) prevTime = 0;
      }
      if (event.key === 'f') for (const item of itemsRef.current) item.freeze();
      if (event.key === 'u') for (const item of itemsRef.current) item.unfreeze();
      console.debug({ paused, prevTime });
    }, { signal: controller.signal });

    function step(time: number, force = false) {
      if (!controller.signal.aborted) requestAnimationFrame(step);
      if (paused && !force) return;
      if (!canvasRef.current) throw new Error('oh no');
      if (!context) throw new Error('oh no');
      const timeDelta = prevTime ? time - prevTime : 0;
      prevTime = time;

      const bounds = initCanvas(canvasRef.current, context);

      const physicsMillis = timeDelta / PHYSICS_STEPS;
      for (let step = 0; step < PHYSICS_STEPS; ++step) {
        for (const circle of itemsRef.current) circle.step(physicsMillis, bounds);
        // sweep and prune
        // https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/23-SAP.html
        // https://youtu.be/euypZDssYxE
        const sorted = itemsRef.current.toSorted((a, b) => a.left - b.left);
        for (let i = 0; i < sorted.length; ++i) {
          const item = sorted[i];
          for (let o = i + 1; o < sorted.length; ++o) {
            const other = sorted[o];
            if (other.left > item.right) break;
            item.collide(other);
          }
        }
      }

      const deleteIxs: number[] = [];
      for (const [i, item] of itemsRef.current.entries()) {
        if (item.idle) --item.opacity;
        if (item.opacity === 0) deleteIxs.push(i);
        else item.draw(context);
      }

      if (deleteIxs.length) itemsRef.current = itemsRef.current.filter((_, i) => !deleteIxs.includes(i));
    }

    requestAnimationFrame(step);

    return () => controller.abort();
  }, [reload]);

  const handleMouseMove = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    if (event.buttons === 0) return;
    createCircle(itemsRef.current, event.clientX, event.clientY, !!(event.buttons & 0x1));
  }, []);

  const handleMouseClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => createCircle(itemsRef.current, event.clientX, event.clientY, true), []);

  const handleMouseRightClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    createCircle(itemsRef.current, event.clientX, event.clientY, false);
  }, []);

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLCanvasElement>) => createCircle(itemsRef.current, event.touches[0].clientX, event.touches[0].clientY),
    []
  );

  return (
    <canvas
      className='border-4 border-foreground size-full touch-none'
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onClick={handleMouseClick}
      onContextMenu={handleMouseRightClick}
      onTouchMove={handleTouchMove}
    />
  );
}
