import { type CSSProperties, type MouseEvent, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Point, type PointLike, type VectorLike } from '@/lib/2d';

export function VectorPicker({
  value,
  onValueChange,
  range,
  name,
  digits = 3,
}: {
  value: VectorLike;
  onValueChange: (value: VectorLike) => void;
  range: number;
  name: string;
  digits?: number;
}) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef({ ...value });
  const spanRef = useRef<HTMLSpanElement>(null);

  // biome-ignore format: no
  const updatePosition = useCallback((vec: VectorLike) => {
    if (!containerRef.current) return;
    if (!dragRef.current) return;
    if (!spanRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const center: PointLike = { x: rect.width / 2, y: rect.height / 2 };
    const radius = rect.width / 2;
    const position = Point.add(center, Point.mult(Point.div(vec, range), radius));
    console.log('updatePosition', 'vec', vec, 'center', center, { radius }, 'position', position);
    dragRef.current.style.left = `${position.x}px`;
    dragRef.current.style.top = `${position.y}px`;
    spanRef.current.innerText = `{ x: ${vec.x.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}, y: ${vec.y.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} }`;
  }, [range, digits]);

  useEffect(() => updatePosition(value), [value, updatePosition]);

  // biome-ignore format: no
  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    requestAnimationFrame(() => {
      if (event.buttons === 0) return;
      if (!containerRef.current) return;
      if (!dragRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const center: PointLike = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      const radius = rect.width / 2;
      const radius2 = radius ** 2;
      const position: PointLike = { x: event.clientX, y: event.clientY };
      const hypot2 = Point.hypot2(center, position);
      if (hypot2 > radius2) return;
      const relative = Point.sub(position, center);
      const value = Point.mult(Point.div(relative, radius), range);
      console.log('handleMouseMove', 'relative', relative, { radius }, 'value', value);
      valueRef.current = value;
      updatePosition(value);
    });
  }, [range, updatePosition]);

  const handleMouseUp = useCallback(() => onValueChange({ ...valueRef.current }), [onValueChange]);

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
        className='size-40 border-2 border-border rounded-full relative row-start-1 col-start-2 row-span-2 vector-picker'
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div ref={dragRef} className='size-5 rounded-full bg-utility/80 border-2 border-background shadow absolute -translate-x-1/2 -translate-y-1/2'></div>
      </div>
      <span ref={spanRef} className='row-start-2 col-start-1' style={spanStyle} />
    </div>
  );
}
