import { type MouseEvent, type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Point, type PointLike, Vector } from '@/lib/2d';
import { clamp } from '@/lib/utils';

interface Circle {
  position: Point;
  velocity: Vector;
  nextPosition: Point | null;
  hue: number;
  radius: number;
  opacity: number;
  nextCollision: Point | null;
  idleCount: number;
}

const GRAVITY = new Vector({ x: 0, y: 0.1 });
const BOUNCE_VELOCITY_RATIO = 0.8;
const GRAVITY_DAMPING_VALUE = 0.05;

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
    nextPosition: null,
    nextCollision: null,
    idleCount: 0,
  });
}

function drawCircle(context: CanvasRenderingContext2D, item: Circle) {
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
      if (event.key === 'f') for (const item of itemsRef.current) item.idleCount = 10;
      if (event.key === 'u') for (const item of itemsRef.current) item.idleCount = 0;
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

      for (let i = 0; i < itemsRef.current.length; ++i) {
        const item = itemsRef.current[i];
        item.nextCollision = null;
        if (item.idleCount >= 5) item.nextPosition = null;
        else {
          item.velocity.addEq(GRAVITY);
          item.nextPosition = item.position.add(item.velocity.mult(timeDelta));
        }
      }

      for (let i = 0; i < itemsRef.current.length; ++i) {
        const item = itemsRef.current[i];

        // null nextPosition means item is idle
        // TODO: enable collision between static and active circle later
        if (item.nextPosition !== null) {
          // skip if we already have a nextCollision
          for (let o = i + 1; item.nextCollision === null && o < itemsRef.current.length; ++o) {
            // TODO: try to switch to a path-based rather than intersection-based solution later
            const other = itemsRef.current[o];
            // ignore all static for now
            if (other.nextPosition === null) continue;
            const hypot = item.nextPosition.hypot2(other.nextPosition);
            const r2 = (item.radius + other.radius) ** 2;
            if (hypot < r2) {
              // FIXME: need the actual collision point
              item.nextCollision = item.nextPosition;
              other.nextCollision = other.nextPosition;
            }
          }

          if (item.nextCollision) {
            //FIXME: need to reflect velocity along the collision normal
            item.velocity.x *= -BOUNCE_VELOCITY_RATIO;
            item.velocity.y *= -BOUNCE_VELOCITY_RATIO;
            //FIXME: nextPosition should be collision point + (reflected velocity * remaining time)
            // item.nextPosition = item.position;
            item.nextPosition.addEq(item.velocity.mult(timeDelta));
          } else {
            // for now, bounds collision is only valid if we haven't hit another circle
            // TODO: a bounce from another circle could knock us oob
            const hitX = item.nextPosition.x <= item.radius ? item.radius : item.nextPosition.x >= bounds.x - item.radius ? bounds.x - item.radius : null;
            const hitY = item.nextPosition.y <= item.radius ? item.radius : item.nextPosition.y >= bounds.y - item.radius ? bounds.y - item.radius : null;
            const intersectRatio = hitX
              ? clamp((hitX - item.position.x) / (item.nextPosition.x - item.position.x), 0, 1)
              : hitY
                ? clamp((hitY - item.position.y) / (item.nextPosition.y - item.position.y), 0, 1)
                : null;

            if (intersectRatio !== null) {
              const remainRatio = 1 - intersectRatio;
              const boundsIntersection = item.position.add(item.velocity.mult(timeDelta * clamp(intersectRatio, 0, 1)));

              item.velocity.x *= typeof hitX === 'number' ? -BOUNCE_VELOCITY_RATIO : BOUNCE_VELOCITY_RATIO;
              item.velocity.y *= typeof hitY === 'number' ? -BOUNCE_VELOCITY_RATIO : BOUNCE_VELOCITY_RATIO;
              if (typeof hitY === 'number' && item.velocity.y < 0) item.velocity.y = Math.min(0, item.velocity.y + GRAVITY_DAMPING_VALUE);

              item.nextPosition = boundsIntersection.add(item.velocity.mult(timeDelta * remainRatio));

              console.debug('boundsIntersection', boundsIntersection, 'ratio', intersectRatio, 'next', item.nextPosition);
            }
          }

          const rounded = item.nextPosition.round();
          if (rounded.eq(item.position)) ++item.idleCount;
          item.position = rounded;
        }

        drawCircle(context, item);
      }
    }

    requestAnimationFrame(step);

    return () => controller.abort();
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
