import { type CSSProperties, type MouseEvent, type TouchEvent, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Point, type PointLike, type VectorLike } from '@/lib/2d';

export function VectorPicker({
  value,
  onValueChange,
  range,
  name,
  digits = 3,
  updateMillis = 300,
}: {
  value: VectorLike;
  onValueChange: (value: VectorLike) => void;
  range: number;
  name: string;
  digits?: number;
  updateMillis?: number;
}) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef({ ...value });
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
    console.debug('updateControl', 'vec', vec, 'center', center, { radius }, 'position', position);
    dragRef.current.style.left = `${position.x}px`;
    dragRef.current.style.top = `${position.y}px`;
    spanRef.current.innerText = `{ x: ${vec.x.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}, y: ${vec.y.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} }`;
  }, [range, digits]);

  useEffect(() => updateControl(value), [value, updateControl]);

  const sendUpdatedValue = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onValueChange({ ...valueRef.current });
  }, [onValueChange]);

  // biome-ignore format: no
  const updateLocalValue = useCallback((pointer: { clientX: number; clientY: number }) => {
    requestAnimationFrame(() => {
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
      const value = Point.mult(Point.div(relative, radius), range);
      console.debug('handleTouchMove', 'relative', relative, { radius }, 'value', value);
      valueRef.current = value;
      timeoutRef.current ??= setTimeout(sendUpdatedValue, updateMillis);
      updateControl(value);
    });
  }, [range, sendUpdatedValue, updateControl, updateMillis]);

  // biome-ignore format: no
  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 0) return;
    updateLocalValue(event);
  }, [updateLocalValue]);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => updateLocalValue(event.touches[0]), [updateLocalValue]);

  // biome-ignore format: no
  const spanStyle: CSSProperties = useMemo(() => ({
    minWidth: `${(6 + digits) * 2 + 2}ch`,
  }), [digits]);

  return (
    <div className='grid grid-cols-[1fr_auto] grid-rows-2 gap-2 items-center flex-wrap'>
      <label htmlFor={id} className='row-start-1 col-start-1'>
        {name}
      </label>
      <div
        ref={containerRef}
        id={id}
        className='size-40 border-2 border-border rounded-full relative row-start-1 col-start-2 row-span-2 vector-picker touch-none'
        onMouseMove={handleMouseMove}
        onMouseUp={sendUpdatedValue}
        onTouchEnd={sendUpdatedValue}
        onTouchMove={handleTouchMove}
      >
        <div ref={dragRef} className='size-5 rounded-full bg-utility/80 border-2 border-background shadow absolute -translate-x-1/2 -translate-y-1/2'></div>
      </div>
      <span ref={spanRef} className='row-start-2 col-start-1' style={spanStyle} />
    </div>
  );
}
