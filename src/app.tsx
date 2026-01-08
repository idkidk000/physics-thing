import { type MouseEvent, type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Point, Vector } from '@/lib/2d';
import { clamp } from '@/lib/utils';

interface Circle {
  position: Point;
  velocity: Vector;
  nextPosition: Point | null;
  hue: number;
  radius: number;
  opacity: number;
  collisions: Vector[];
  static: boolean;
}

const GRAVITY = new Vector({ x: 0, y: 0.1 });
const BOUNCE_VELOCITY_RATIO = 0.8;
const GRAVITY_DAMPING_VALUE = 0.2;

function addCircle(items: Circle[], x: number, y: number, left?: boolean) {
  const radius = Math.round(Math.random() * 20 + 10);
  if (items.values().find((item) => (item.position.x - x) ** 2 + (item.position.y - y) ** 2 <= (item.radius + radius) ** 2)) return;
  items.push({
    velocity: new Vector({
      x: left ? -1 : left === false ? 1 : Math.round(Math.random()) * 2 - 1,
      y: Math.random() - 2,
    }),
    position: new Point({ x, y }),
    hue: Math.round(Math.random() * 360),
    radius,
    opacity: 100,
    collisions: [],
    nextPosition: null,
    static: false,
  });
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reload, setReload] = useState(0);
  const itemsRef = useRef<Circle[]>([]);

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
        if (item.static) {
          item.nextPosition = item.position;
        } else {
          item.velocity.addEq(GRAVITY);
          item.nextPosition = item.position.add(item.velocity.mult(timeDelta));
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
            const boxIntersect = item.position.add(item.velocity.mult(timeDelta * clamp(intersectRatio, 0, 1)));

            item.velocity.x *= typeof hitX === 'number' ? -BOUNCE_VELOCITY_RATIO : BOUNCE_VELOCITY_RATIO;
            item.velocity.y *= typeof hitY === 'number' ? -BOUNCE_VELOCITY_RATIO : BOUNCE_VELOCITY_RATIO;
            if (typeof hitY === 'number' && item.velocity.y < 0) item.velocity.y = Math.min(0, item.velocity.y + GRAVITY_DAMPING_VALUE);

            item.nextPosition = boxIntersect.add(item.velocity.mult(timeDelta * remainRatio));

            console.debug('boxIntersect', boxIntersect, 'ratio', intersectRatio, 'next', item.nextPosition);
          }

          const rounded = item.nextPosition.round();
          if (rounded.eq(item.position)) item.static = true;
          item.position = rounded;
        }

        context.beginPath();
        context.arc(item.position.x, item.position.y, item.radius, 0, Math.PI * 2);
        context.closePath();
        context.fillStyle = `hsl(${item.hue} 100 50 / ${item.opacity}%)`;
        context.fill();
        context.save();
        context.clip();

        // highlight
        // context.beginPath();
        // context.arc(item.position.x, item.position.y, item.radius, Math.PI * 0.75, Math.PI * 1.75);
        // context.arc(item.position.x + item.radius * 0.8, item.position.y + item.radius * 0.8, item.radius * 1.5, Math.PI * 1.75, Math.PI * 0.75, true);
        // context.closePath();
        // context.fillStyle = `hsl(${item.hue} 100 80 / ${item.opacity}%)`;
        // context.fill();

        // shadow
        context.beginPath();
        context.arc(item.position.x, item.position.y, item.radius, Math.PI * -0.25, Math.PI * 0.75);
        context.arc(item.position.x - item.radius * 0.8, item.position.y - item.radius * 0.8, item.radius * 1.5, Math.PI * 0.75, Math.PI * -0.25, true);
        context.closePath();
        context.fillStyle = `hsl(${item.hue} 100 30 / ${item.opacity}%)`;
        context.fill();

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
    addCircle(itemsRef.current, event.clientX, event.clientY, !!(event.buttons & 0x1));
  }, []);

  const handleMouseClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => addCircle(itemsRef.current, event.clientX, event.clientY, true), []);

  const handleMouseRightClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    addCircle(itemsRef.current, event.clientX, event.clientY, false);
  }, []);

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLCanvasElement>) => addCircle(itemsRef.current, event.touches[0].clientX, event.touches[0].clientY),
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
