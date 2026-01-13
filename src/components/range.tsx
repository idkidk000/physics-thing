import { type ChangeEvent, type MouseEvent, type TouchEvent, useCallback, useEffect, useId, useRef } from 'react';
import { Button } from '@/components/button';
import { Utils } from '@/lib/utils';

/** for picking a single value from a range */
export function Range({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  label,
  unit = '',
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  label: string;
  unit?: string;
}) {
  const id = useId();
  const decimals = Math.max(0, 0 - Math.floor(Math.log10(step)));

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.valueAsNumber), [onValueChange]);

  return (
    <div className='flex flex-row gap-2 items-center flex-wrap justify-center'>
      <label htmlFor={id} className='grow basis-16'>
        {label}
      </label>
      <input id={id} type='range' min={min} max={max} step={step} value={value} onChange={handleChange} />
      <span className='grow basis-0'>{`${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${unit}`}</span>
    </div>
  );
}

/** for picking two values, i.e. a sub-range, from an inclusive range  */
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
  const grabbedRef = useRef<'min' | 'max' | null>(null);
  const trackElemRef = useRef<HTMLDivElement>(null);
  const valueMinElemRef = useRef<HTMLButtonElement>(null);
  const valueMaxElemRef = useRef<HTMLButtonElement>(null);
  const spanElemRef = useRef<HTMLSpanElement>(null);

  // biome-ignore format: no
  const updateControl = useCallback((valueMin: number, valueMax: number) => {
    if (!trackElemRef.current || !valueMinElemRef.current || !valueMaxElemRef.current || !spanElemRef.current) return;
    const minPercent = `${(100 * (valueMin - min)) / (max - min)}%`;
    const maxPercent = `${(100 * (valueMax - min)) / (max - min)}%`;
    // console.debug('RangeTwo updateControl', { valueMin, valueMax }, { minPercent, maxPercent });
    trackElemRef.current.style.background = `border-box linear-gradient(to right, transparent ${minPercent}, var(--color-accent) ${minPercent}, var(--color-accent) ${maxPercent}, transparent ${maxPercent}) no-repeat`;
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
    const mapped = Utils.roundTo(Utils.clamp(Utils.lerp(min, max, rect.width, pointer.clientX - rect.x), min, max), decimals);

    if (grabbedRef.current === 'max' && mapped < deferredValueRef.current.valueMin) {
      deferredValueRef.current.valueMax = deferredValueRef.current.valueMin;
      grabbedRef.current = 'min';
    } else if (grabbedRef.current === 'min' && mapped > deferredValueRef.current.valueMax) {
      deferredValueRef.current.valueMin = deferredValueRef.current.valueMax;
      grabbedRef.current = 'max';
    }

    if (grabbedRef.current === 'max') deferredValueRef.current.valueMax = mapped;
    else if (grabbedRef.current === 'min') deferredValueRef.current.valueMin = mapped;

    timeoutRef.current ??= setTimeout(sendDeferredValue, updateMillis);
    updateControl(deferredValueRef.current.valueMin, deferredValueRef.current.valueMax);
  }, [max, min, sendDeferredValue, updateControl, updateMillis, decimals]);

  // biome-ignore format: no
  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 0x0) {
      grabbedRef.current = null;
      return;
    }
    if (grabbedRef.current === null) {
      if (event.target === valueMinElemRef.current) grabbedRef.current = 'min';
      else if (event.target === valueMaxElemRef.current) grabbedRef.current = 'max';
      else return;
    }
    event.stopPropagation()
    event.preventDefault();
    updateDeferredValue(event);
  }, [updateDeferredValue]);

  // biome-ignore format: no
  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (grabbedRef.current === null) {
      if (event.target === valueMinElemRef.current) grabbedRef.current = 'min';
      else if (event.target === valueMaxElemRef.current) grabbedRef.current = 'max';
      else return;
    }
    updateDeferredValue(event.touches[0]);
  }, [updateDeferredValue]);

  // biome-ignore format: no
  const handleTouchEnd = useCallback(() => { grabbedRef.current = null; }, []);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!trackElemRef.current) return;
      const rect = trackElemRef.current.getBoundingClientRect();
      const mapped = Utils.clamp(Utils.lerp(min, max, rect.width, event.clientX - rect.x), min, max);
      const closest = Math.abs(valueMin - mapped) < Math.abs(valueMax - mapped) ? 'min' : 'max';
      grabbedRef.current = closest;
      updateDeferredValue(event);
    },
    [max, min, updateDeferredValue, valueMax, valueMin]
  );

  return (
    <div className='flex flex-row gap-2 items-center flex-wrap justify-center'>
      <label htmlFor={id} className='grow basis-16'>
        {label}
      </label>
      <div
        className='slider-track relative w-45 group touch-none bg-transparent'
        id={id}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        ref={trackElemRef}
      >
        <Button
          type='button'
          role='slider'
          className='slider-thumb absolute -translate-1/2 top-1/2'
          variant='unstyled'
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueMin}
          ref={valueMinElemRef}
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
        />
      </div>
      <span className='grow basis-0 flex flex-col' ref={spanElemRef}>
        <span />
        <span />
      </span>
    </div>
  );
}
