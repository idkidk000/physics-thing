import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { clamp, type Point, pointAdd, pointMult, pointRound, type Vector } from '@/lib/utils';

interface Item {
  position: Point;
  velocity: Vector;
  nextPosition: Point | null;
  hue: number;
  radius: number;
  opacity: number;
  collisions: Vector[];
}

const GRAVITY: Vector = { x: 0, y: 0.1 } as const;
const BOUNCE_DAMPING_RATIO = 0.2;
const GRAVITY_DAMPING_VALUE = 0.2;

function addItem(items: Item[], x: number, y: number) {
  const radius = Math.round(Math.random() * 20 + 10);
  if (items.values().find((item) => (item.position.x - x) ** 2 + (item.position.y - y) ** 2 <= (item.radius + radius) ** 2)) return;
  items.push({
    velocity: {
      // x: Math.random() * 2 - 1,
      x: Math.round(Math.random()) * 2 - 1,
      y: Math.random() - 2,
    },
    position: { x, y },
    hue: Math.round(Math.random() * 360),
    radius,
    opacity: 100,
    collisions: [],
    nextPosition: null,
  });
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reload, setReload] = useState(0);
  const itemsRef = useRef<Item[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies(reload): deliberate
  useEffect(() => {
    const loopController = new AbortController();
    const listenerController = new AbortController();
    if (!canvasRef.current) throw new Error('oh no');
    const context = canvasRef.current.getContext('2d');
    if (!context) throw new Error('oh no');
    let prevTime = 0;
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'r') setReload(Math.random());
        if (event.key === 'd') console.log(itemsRef.current);
        if (event.key === 'c') itemsRef.current = [];
        if (event.key === 's') {
          if (!loopController.signal.aborted) loopController.abort();
          step(prevTime + 1);
        }
      },
      { signal: listenerController.signal }
    );

    function step(time: number) {
      if (!loopController.signal.aborted) requestAnimationFrame(step);
      if (!canvasRef.current) return;
      if (!context) return;
      const timeDelta = prevTime ? time - prevTime : 0;
      // const timeDelta = 1;
      prevTime = time;

      const rect = canvasRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
      context.fillStyle = '#000';
      context.fillRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < itemsRef.current.length; ++i) {
        const item = itemsRef.current[i];
        item.velocity = pointAdd(item.velocity, GRAVITY);
        item.nextPosition = pointAdd(item.position, pointMult(item.velocity, timeDelta));
        item.collisions = [];

        const hitX = item.nextPosition.x <= item.radius ? item.radius : item.nextPosition.x >= rect.width - item.radius ? rect.width - item.radius : null;
        const hitY = item.nextPosition.y <= item.radius ? item.radius : item.nextPosition.y >= rect.height - item.radius ? rect.height - item.radius : null;
        const intersectRatio = hitX
          ? clamp((hitX - item.position.x) / (item.nextPosition.x - item.position.x), 0, 1)
          : hitY
            ? clamp((hitY - item.position.y) / (item.nextPosition.y - item.position.y), 0, 1)
            : null;

        if (intersectRatio !== null) {
          const remainRatio = 1 - intersectRatio;
          const boxIntersect = pointAdd(item.position, pointMult(item.velocity, timeDelta * clamp(intersectRatio, -1, 1)));

          item.velocity.x *= typeof hitX === 'number' ? -0.8 : 0.8;
          item.velocity.y *= typeof hitY === 'number' ? -0.8 : 0.8;
          if (typeof hitY === 'number' && item.velocity.y < 0) item.velocity.y = Math.min(0, item.velocity.y + 0.2);

          item.nextPosition = pointAdd(boxIntersect, pointMult(item.velocity, timeDelta * remainRatio));

          console.debug('boxIntersect', boxIntersect, 'ratio', intersectRatio, 'next', item.nextPosition);
        }

        item.position = pointRound(item.nextPosition);

        context.beginPath();
        context.arc(item.position.x, item.position.y, item.radius, 0, Math.PI * 2);
        context.closePath();
        context.fillStyle = `hsl(${item.hue} 100 50 / ${item.opacity}%)`;
        context.fill();
        context.save();
        context.clip();

        // highlight
        context.beginPath();
        context.arc(item.position.x, item.position.y, item.radius, Math.PI * 0.75, Math.PI * 1.75);
        context.arc(item.position.x + item.radius * 0.8, item.position.y + item.radius * 0.8, item.radius * 1.5, Math.PI * 1.75, Math.PI * 0.75, true);
        context.closePath();
        context.fillStyle = `hsl(${item.hue} 100 80 / ${item.opacity}%)`;
        context.fill();

        // shadow
        // context.beginPath();
        // context.arc(item.position.x, item.position.y, item.radius, Math.PI * -0.25, Math.PI * 0.75);
        // context.arc(item.position.x - item.radius * 0.8, item.position.y - item.radius * 0.8, item.radius * 1.5, Math.PI * 0.75, Math.PI * -0.25, true);
        // context.closePath();
        // context.fillStyle = `hsl(${item.hue} 100 30 / ${item.opacity}%)`;
        // context.fill();

        context.restore();
      }

      itemsRef.current = itemsRef.current.filter((item) => item.position.y < rect.height);
    }

    requestAnimationFrame(step);

    return () => {
      loopController.abort();
      listenerController.abort();
    };
  }, [reload]);

  const handleMouseMove = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    if (event.buttons === 0) return;
    addItem(itemsRef.current, event.clientX, event.clientY);
  }, []);

  const handleMouseClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => addItem(itemsRef.current, event.clientX, event.clientY), []);

  const handleMouseRightClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    console.info(itemsRef.current);
  }, []);

  return (
    <canvas
      className='border-4 border-foreground size-full'
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onClick={handleMouseClick}
      onContextMenu={handleMouseRightClick}
    />
  );
}
