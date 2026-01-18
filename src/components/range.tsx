import { type KeyboardEvent, type MouseEvent, type TouchEvent, useCallback, useEffect, useId, useRef } from 'react';
import { Button } from '@/components/button';
import * as Utils from '@/lib/utils';

/** for picking a single value from a range
 *
 * needs to be inside a grid with 3 columns
 *
 * custom component because browser-specific input thumb selectors don't handle :hover etc
 */
export function Range({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  label,
  unit = '',
  updateMillis = 300,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  label: string;
  unit?: string;
  updateMillis?: number;
}) {
  const id = useId();
  const decimals = Math.max(0, 0 - Math.floor(Math.log10(step)));
  const deferredValueRef = useRef(value);
  const timeoutRef = useRef<number | null>(null);
  const trackElemRef = useRef<HTMLDivElement>(null);
  const valueElemRef = useRef<HTMLButtonElement>(null);
  const spanElemRef = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);

  // biome-ignore format: no
  const updateControl = useCallback((value: number) => {
    if (!trackElemRef.current || !valueElemRef.current || !spanElemRef.current) return;
    const trackWidth = trackElemRef.current.getBoundingClientRect().width;
    const buttonWidth = valueElemRef.current.getBoundingClientRect().width * 0.8;
    const percent = `${(((value - min) / (max - min)) * (1 - buttonWidth / trackWidth) + buttonWidth / trackWidth / 2) * 100}%`;
    trackElemRef.current.style.setProperty('--percent-to', percent);
    valueElemRef.current.style.left = percent;
    spanElemRef.current.textContent = `${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${unit}`;
  }, [max, min, decimals, unit]);

  useEffect(() => updateControl(value), [value, updateControl]);

  const sendDeferredValue = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onValueChange(deferredValueRef.current);
  }, [onValueChange]);

  // biome-ignore format: no
  const updateDeferredValue = useCallback((pointer: { clientX: number }) => {
    if (!trackElemRef.current || !valueElemRef.current) return;
    const rect = trackElemRef.current.getBoundingClientRect();
    const buttonWidth = valueElemRef.current.getBoundingClientRect().width * 0.8;
    pointer.clientX - rect.x - buttonWidth / 2;
    const mapped = Utils.roundTo(Utils.clamp(Utils.lerp(min, max, rect.width - buttonWidth, pointer.clientX - rect.x - buttonWidth / 2), min, max), decimals);
    deferredValueRef.current = mapped;
    timeoutRef.current ??= setTimeout(sendDeferredValue, updateMillis);
    updateControl(deferredValueRef.current);
  }, [max, min, sendDeferredValue, updateControl, updateMillis, decimals]);

  // biome-ignore format: no
  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 0x0 || !draggingRef.current) return;
    updateDeferredValue(event);
  }, [updateDeferredValue]);

  // biome-ignore format: no
  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    updateDeferredValue(event.touches[0]);
  }, [updateDeferredValue]);

  // biome-ignore format: no
  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    updateDeferredValue(event);
  }, [updateDeferredValue]);

  // biome-ignore format: no
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.key.startsWith('Arrow')) return;
    event.stopPropagation();
    event.preventDefault();
    const nextValue =
      event.key === 'ArrowDown'
        ? min
        : event.key === 'ArrowUp'
          ? max
          : Utils.clamp(deferredValueRef.current + (event.key === 'ArrowLeft' ? -step : step), min, max);
    if (nextValue === deferredValueRef.current) return;
    deferredValueRef.current = nextValue;
    sendDeferredValue();
  }, [max, min, sendDeferredValue, step]);

  const disableDragging = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const enableDragging = useCallback(() => {
    draggingRef.current = true;
  }, []);

  return (
    <div
      className='col-span-3 grid grid-cols-subgrid items-center'
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseDown={enableDragging}
      onMouseUp={disableDragging}
      onMouseEnter={disableDragging}
      onMouseLeave={disableDragging}
    >
      <label htmlFor={id}>{label}</label>
      <div
        className='slider-track relative group touch-none bg-transparent'
        id={id}
        ref={trackElemRef}
        onClick={handleClick}
        role='slider'
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <Button type='button' variant='unstyled' className='slider-thumb absolute -translate-1/2 top-1/2' ref={valueElemRef} />
      </div>
      <span className='flex flex-col' ref={spanElemRef} />
    </div>
  );
}

/** for picking two values, i.e. a sub-range, from an inclusive range
 *
 * needs to be inside a grid with 3 columns
 */
export function RangeTwo({
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  onValueChange,
  label,
  unit = '',
  updateMillis = 300,
}: {
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onValueChange: (min: number, max: number) => void;
  label: string;
  unit?: string;
  updateMillis?: number;
}) {
  const id = useId();
  const decimals = Math.max(0, 0 - Math.floor(Math.log10(step)));
  const deferredValueRef = useRef({ valueMin, valueMax });
  const timeoutRef = useRef<number | null>(null);
  const draggingRef = useRef<'min' | 'max' | null>(null);
  const trackElemRef = useRef<HTMLDivElement>(null);
  const valueMinElemRef = useRef<HTMLButtonElement>(null);
  const valueMaxElemRef = useRef<HTMLButtonElement>(null);
  const spanElemRef = useRef<HTMLSpanElement>(null);

  // biome-ignore format: no
  const updateControl = useCallback((valueMin: number, valueMax: number) => {
    if (!trackElemRef.current || !valueMinElemRef.current || !valueMaxElemRef.current || !spanElemRef.current) return;
        const trackWidth = trackElemRef.current.getBoundingClientRect().width;
    const buttonWidth = valueMinElemRef.current.getBoundingClientRect().width * 0.8;
    const minPercent = `${(((valueMin - min) / (max - min)) * (1 - buttonWidth / trackWidth) + buttonWidth / trackWidth / 2) * 100}%`;
    const maxPercent = `${(((valueMax - min) / (max - min)) * (1 - buttonWidth / trackWidth) + buttonWidth / trackWidth / 2) * 100}%`;
    trackElemRef.current.style.setProperty('--percent-from', minPercent)
    trackElemRef.current.style.setProperty('--percent-to', maxPercent)
    valueMinElemRef.current.style.left = minPercent;
    valueMaxElemRef.current.style.left = maxPercent;
    spanElemRef.current.children[0].textContent = `${valueMin.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} -`;
    spanElemRef.current.children[1].textContent = `${valueMax.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${unit}`;

  }, [max, min, decimals, unit]);

  useEffect(() => updateControl(valueMin, valueMax), [valueMin, valueMax, updateControl]);

  const sendDeferredValue = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onValueChange(deferredValueRef.current.valueMin, deferredValueRef.current.valueMax);
  }, [onValueChange]);

  // biome-ignore format: no
  const updateDeferredValue = useCallback((pointer: { clientX: number }) => {
    if (!trackElemRef.current || !valueMinElemRef.current || !valueMaxElemRef.current) return;
    const rect = trackElemRef.current.getBoundingClientRect();
    const buttonWidth = valueMinElemRef.current.getBoundingClientRect().width * 0.8;
    pointer.clientX - rect.x - buttonWidth / 2;
    const mapped = Utils.roundTo(Utils.clamp(Utils.lerp(min, max, rect.width - buttonWidth, pointer.clientX - rect.x - buttonWidth / 2), min, max), decimals);

    if (draggingRef.current === 'max' && mapped < deferredValueRef.current.valueMin) {
      deferredValueRef.current.valueMax = deferredValueRef.current.valueMin;
      draggingRef.current = 'min';
    } else if (draggingRef.current === 'min' && mapped > deferredValueRef.current.valueMax) {
      deferredValueRef.current.valueMin = deferredValueRef.current.valueMax;
      draggingRef.current = 'max';
    }

    if (draggingRef.current === 'max') deferredValueRef.current.valueMax = mapped;
    else if (draggingRef.current === 'min') deferredValueRef.current.valueMin = mapped;

    timeoutRef.current ??= setTimeout(sendDeferredValue, updateMillis);
    updateControl(deferredValueRef.current.valueMin, deferredValueRef.current.valueMax);
  }, [max, min, sendDeferredValue, updateControl, updateMillis, decimals]);

  // biome-ignore format: no
  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 0x0) {
      draggingRef.current = null;
      return;
    }
    if (draggingRef.current === null) {
      if (event.target === valueMinElemRef.current) draggingRef.current = 'min';
      else if (event.target === valueMaxElemRef.current) draggingRef.current = 'max';
      else return;
    }
    event.stopPropagation()
    event.preventDefault();
    updateDeferredValue(event);
  }, [updateDeferredValue]);

  // biome-ignore format: no
  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (draggingRef.current === null) {
      if (event.target === valueMinElemRef.current) draggingRef.current = 'min';
      else if (event.target === valueMaxElemRef.current) draggingRef.current = 'max';
      else return;
    }
    updateDeferredValue(event.touches[0]);
  }, [updateDeferredValue]);

  // biome-ignore format: no
  const handleTouchEnd = useCallback(() => { draggingRef.current = null; }, []);

  // biome-ignore format: no
  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!trackElemRef.current) return;
    const rect = trackElemRef.current.getBoundingClientRect();
    const mapped = Utils.clamp(Utils.lerp(min, max, rect.width, event.clientX - rect.x), min, max);
    const closest = Math.abs(valueMin - mapped) < Math.abs(valueMax - mapped) ? 'min' : 'max';
    draggingRef.current = closest;
    updateDeferredValue(event);
  }, [max, min, updateDeferredValue, valueMax, valueMin]);

  const disableDragging = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!event.key.startsWith('Arrow')) return;
      event.stopPropagation();
      event.preventDefault();
      if (event.target === valueMinElemRef.current) {
        const next =
          event.key === 'ArrowUp'
            ? deferredValueRef.current.valueMax
            : event.key === 'ArrowDown'
              ? min
              : Utils.clamp(deferredValueRef.current.valueMin + (event.key === 'ArrowLeft' ? -step : step), min, deferredValueRef.current.valueMax);
        if (next === deferredValueRef.current.valueMin) return;
        deferredValueRef.current.valueMin = next;
        sendDeferredValue();
      }
      if (event.target === valueMaxElemRef.current) {
        const next =
          event.key === 'ArrowUp'
            ? max
            : event.key === 'ArrowDown'
              ? deferredValueRef.current.valueMin
              : Utils.clamp(deferredValueRef.current.valueMax + (event.key === 'ArrowLeft' ? -step : step), deferredValueRef.current.valueMin, max);
        if (next === deferredValueRef.current.valueMax) return;
        deferredValueRef.current.valueMax = next;
        sendDeferredValue();
      }
    },
    [max, min, sendDeferredValue, step]
  );

  return (
    <div
      className='col-span-3 grid grid-cols-subgrid items-center'
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={disableDragging}
      onMouseLeave={disableDragging}
    >
      <label htmlFor={id}>{label}</label>
      <div className='slider-track relative group touch-none bg-transparent' id={id} onClick={handleClick} ref={trackElemRef}>
        <Button
          type='button'
          role='slider'
          className='slider-thumb absolute -translate-1/2 top-1/2'
          variant='unstyled'
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueMin}
          ref={valueMinElemRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        />
        <Button
          type='button'
          role='slider'
          className='slider-thumb absolute -translate-1/2 top-1/2'
          variant='unstyled'
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueMax}
          ref={valueMaxElemRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        />
      </div>
      <span className='flex flex-col' ref={spanElemRef}>
        <span />
        <span />
      </span>
    </div>
  );
}
