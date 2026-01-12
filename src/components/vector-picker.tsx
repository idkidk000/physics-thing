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
  const spanVecRef = useRef<HTMLSpanElement>(null);
  const spanDegRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // biome-ignore format: no
  const updateControl = useCallback((vec: VectorLike) => {
    if (!containerRef.current || !dragRef.current || !spanVecRef.current || !spanDegRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const center: PointLike = { x: rect.width / 2, y: rect.height / 2 };
    const radius = rect.width / 2;
    const position = Point.add(center, Point.mult(Point.div(vec, range), radius));
    dragRef.current.style.left = `${position.x}px`;
    dragRef.current.style.top = `${position.y}px`;
    spanVecRef.current.innerText = `{ x: ${vec.x.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}, y: ${vec.y.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} }`;
    spanDegRef.current.innerText = `${Math.round(Vector.toDegrees(vec))}°, strength: ${Vector.hypot(vec).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
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
  const updateDeferredValue = useCallback((pointer: { clientX: number; clientY: number }) => {
    if (!containerRef.current || !dragRef.current) return;
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
    updateDeferredValue(event);
  }, [updateDeferredValue]);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => updateDeferredValue(event.touches[0]), [updateDeferredValue]);

  const handleMouseClick = useCallback((event: MouseEvent<HTMLDivElement>) => updateDeferredValue(event), [updateDeferredValue]);

  // biome-ignore format: no
  const colStyle: CSSProperties = useMemo(() => ({
    minWidth: `${(6 + digits) * 2 + 2}ch`,
  }), [digits]);

  return (
    <div className='flex gap-2'>
      <div className='flex flex-col my-auto grow' style={colStyle}>
        <label htmlFor={id}>{label}</label>
        <span ref={spanVecRef} />
        <span ref={spanDegRef} />
      </div>
      <div
        ref={containerRef}
        id={id}
        className='size-40 border-2 border-border rounded-full relative touch-none group'
        onMouseMove={handleMouseMove}
        onMouseUp={sendDeferredValue}
        onTouchEnd={sendDeferredValue}
        onTouchMove={handleTouchMove}
        onClick={handleMouseClick}
        // biome-ignore lint/a11y/useAriaPropsForRole: this is the least unsuitable role but aria-valuenow must be a number
        role='slider'
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
    </div>
  );
}
