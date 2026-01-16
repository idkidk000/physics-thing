/** biome-ignore-all lint/a11y/useSemanticElements: no */

import { type MouseEvent, type TouchEvent, useCallback, useEffect, useId, useRef } from 'react';
import { Button } from '@/components/button';
import * as Utils from '@/lib/utils';

export function Switch({
  value,
  onValueChange,
  label,
  role = 'checkbox',
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  role?: 'checkbox' | 'radio';
}) {
  const id = useId();
  const valueRef = useRef(value);
  const trackRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleClick = useCallback(() => onValueChange(!value), [onValueChange, value]);

  // biome-ignore format: no
  const sendUpdateIfChanged = useCallback((pointer: { clientX: number }) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const nextValue = !!(Utils.clamp(Math.round((pointer.clientX - rect.x) / rect.width), 0, 1));
    if (nextValue !== valueRef.current) onValueChange(nextValue);
  }, [onValueChange]);

  // biome-ignore format: no
  const handleMouseMove = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (event.buttons === 0x0) return;
    sendUpdateIfChanged(event);
  }, [sendUpdateIfChanged]);

  // biome-ignore format: no
  const handleTouchMove = useCallback((event: TouchEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    sendUpdateIfChanged(event.touches[0]);
  }, [sendUpdateIfChanged]);

  return (
    <div className='flex flex-row gap-4 items-center flex-wrap'>
      <label htmlFor={id} className='grow'>
        {label}
      </label>
      <Button
        id={id}
        type='button'
        className='h-4 w-10 rounded-full m-0 p-0 justify-center transition-colors bg-background aria-checked:bg-accent group border-2 text-foreground touch-none'
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        role={role}
        aria-checked={value}
        variant='default'
        ref={trackRef}
      >
        <span className='slider-thumb -translate-x-1/2 transition-[translate,scale] group-aria-checked:translate-x-1/2' />
      </Button>
    </div>
  );
}
