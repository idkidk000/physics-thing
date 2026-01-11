import { type CSSProperties, type MouseEvent, type TouchEvent, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Point, type PointLike, Vector, type VectorLike } from '@/lib/2d';

const DEVICE_Y_OFFSET_DEG = -45;
const DEVICE_XY_CLAMP_DEG = 22.5;

export function VectorPicker({
  value,
  onValueChange,
  range,
  label,
  digits = 2,
  updateMillis = 300,
}: {
  value: VectorLike;
  onValueChange: (value: VectorLike) => void;
  range: number;
  label: string;
  digits?: number;
  updateMillis?: number;
}) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const deferredValueRef = useRef({ ...value });
  const spanRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // biome-ignore format: no
  const updateControl = useCallback((vec: VectorLike) => {
    if (!containerRef.current) return;
    if (!dragRef.current) return;
    if (!spanRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const center: PointLike = { x: rect.width / 2, y: rect.height / 2 };
    const radius = rect.width / 2;
    const position = Point.add(center, Point.mult(Point.div(vec, range), radius));
    dragRef.current.style.left = `${position.x}px`;
    dragRef.current.style.top = `${position.y}px`;
    spanRef.current.innerText = `{ x: ${vec.x.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}, y: ${vec.y.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} }`;
  }, [range, digits]);

  useEffect(() => updateControl(value), [value, updateControl]);

  const sendDeferredValue = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onValueChange({ ...deferredValueRef.current });
  }, [onValueChange]);

  useEffect(() => {
    const controller = new AbortController();

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/deviceorientation_event
    // disregard `Orientation values explained` section
    // biome-ignore format: no
    window.addEventListener('deviceorientation', (event) => {
      const { beta, gamma } = event;
      if (beta === null || gamma === null) return;
      const raw: VectorLike = { x: gamma, y: beta +DEVICE_Y_OFFSET_DEG };
      const hypot = Vector.hypot(raw);
      const scaled = Vector.roundTo(Vector.mult(Vector.div(raw, Math.max(DEVICE_XY_CLAMP_DEG, hypot)), range),digits);
      const min = (10 ** -digits)*5
      if (Math.abs(scaled.x) <= min) scaled.x = 0;
      if (Math.abs(scaled.y) <= min) scaled.y = 0;
      deferredValueRef.current = scaled;
      updateControl(scaled);
      timeoutRef.current ??= setTimeout(sendDeferredValue, updateMillis);
    }, { signal: controller.signal });

    return () => controller.abort();
  }, [range, sendDeferredValue, updateControl, updateMillis, digits]);

  // biome-ignore format: no
  const updateLocalValue = useCallback((pointer: { clientX: number; clientY: number }) => {
    if (!containerRef.current) return;
    if (!dragRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const center: PointLike = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const radius = rect.width / 2;
    const radius2 = radius ** 2;
    const position: PointLike = { x: pointer.clientX, y: pointer.clientY };
    const hypot2 = Point.hypot2(center, position);
    if (hypot2 > radius2) return;
    const relative = Point.sub(position, center);
    const value = Point.roundTo(Point.mult(Point.div(relative, radius), range), digits);
    const min=(10**-digits)*5
    if (Math.abs(value.x)<=min) value.x=0;
    if (Math.abs(value.y)<=min) value.y=0;
    deferredValueRef.current = value;
    timeoutRef.current ??= setTimeout(sendDeferredValue, updateMillis);
    updateControl(value);
  }, [range, sendDeferredValue, updateControl, updateMillis, digits]);

  // biome-ignore format: no
  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 0) return;
    updateLocalValue(event);
  }, [updateLocalValue]);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => updateLocalValue(event.touches[0]), [updateLocalValue]);

  const handleMouseClick = useCallback((event: MouseEvent<HTMLDivElement>) => updateLocalValue(event), [updateLocalValue]);

  // biome-ignore format: no
  const spanStyle: CSSProperties = useMemo(() => ({
    minWidth: `${(6 + digits) * 2 + 2}ch`,
  }), [digits]);

  return (
    <div className='grid grid-cols-[1fr_auto] grid-rows-2 gap-x-2 items-end'>
      <label htmlFor={id} className='row-start-1 col-start-1'>
        {label}
      </label>
      <div
        ref={containerRef}
        id={id}
        className='size-40 border-2 border-border rounded-full relative row-start-1 col-start-2 row-span-2 touch-none group'
        onMouseMove={handleMouseMove}
        onMouseUp={sendDeferredValue}
        onTouchEnd={sendDeferredValue}
        onTouchMove={handleTouchMove}
        onClick={handleMouseClick}
      >
        <div ref={dragRef} className='slider-thumb absolute -translate-3 bg-accent cursor-move'></div>
        <svg
          width='100'
          height='100'
          viewBox='0 0 100 100'
          fill='none'
          stroke='currentColor'
          strokeWidth='1'
          strokeLinecap='round'
          strokeLinejoin='round'
          role='graphics-symbol'
          className='size-full text-border'
        >
          <circle cx='50' cy='50' r='40' />
          <circle cx='50' cy='50' r='30' />
          <circle cx='50' cy='50' r='20' />
          <circle cx='50' cy='50' r='10' />
          <line x1='0' x2='100' y1='50' y2='50' />
          <line x1='50' x2='50' y1='0' y2='100' />
        </svg>
      </div>
      <span ref={spanRef} className='row-start-2 col-start-1 self-start' style={spanStyle} />
    </div>
  );
}
