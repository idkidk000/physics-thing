import { type CSSProperties, type MouseEvent, type TouchEvent, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { Button } from '@/components/button';
import { Switch } from '@/components/switch';
import * as Utils from '@/lib/utils';

export interface RadioOption {
  value: number;
  label: string;
}

function RadioSwitchOption({
  option,
  value,
  onValueChange,
  multi,
  multiFallback,
}: {
  option: RadioOption;
  value: number;
  onValueChange: (value: number) => void;
  multi: boolean;
  multiFallback: number;
}) {
  // biome-ignore format: no
  const handleChange = useCallback((checked: boolean) => {
    if (multi) onValueChange((checked ? value | option.value : value ^ option.value) || multiFallback);
    else if (checked) onValueChange(option.value);
  }, [onValueChange, option, multi, value, multiFallback]);

  return <Switch label={option.label} value={multi ? !!(value & option.value) : value === option.value} onValueChange={handleChange} role='radio' />;
}

/** array of switches with radiogroup/radio role */
export function RadioSwitch({
  value,
  onValueChange,
  label,
  options,
  multi = false,
  multiFallback = 0,
  className = 'flex flex-row flex-wrap',
}: {
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
  options: RadioOption[];
  multi?: boolean;
  multiFallback?: number;
  className?: string;
}) {
  const id = useId();

  return (
    <div className='flex flex-col gap-2'>
      {label && (
        <label htmlFor={id} className='inline-flex'>
          {label}
        </label>
      )}
      <div className={`gap-4 items-center justify-between ${className}`} role='radiogroup' id={id}>
        {options.map((option) => (
          <RadioSwitchOption key={option.value} option={option} value={value} onValueChange={onValueChange} multi={multi} multiFallback={multiFallback} />
        ))}
      </div>
    </div>
  );
}

function RadioSliderOption({ option, onValueChange }: { option: RadioOption; onValueChange: (value: number) => void }) {
  const handleClick = useCallback(() => onValueChange(option.value), [onValueChange, option.value]);

  return (
    <Button role='radio' type='button' onClick={handleClick} className='flex justify-center' variant='unstyled'>
      {option.label}
    </Button>
  );
}

/** array of buttons and a click/draggable slider, all with radiogroup/radio role */
export function RadioSlider({
  value,
  onValueChange,
  label,
  options,
}: {
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
  options: RadioOption[];
}) {
  const id = useId();
  const valueRef = useRef(value);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // biome-ignore format: no
  const gridStyle: CSSProperties = useMemo(() => ({
    gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
  }), [options]);

  // biome-ignore format: no
  const buttonStyle: CSSProperties = useMemo(() => ({
    left: `${(100 / options.length) * (options.findIndex((option) => option.value === value) + 0.5)}%`,
  }), [value, options]);

  // biome-ignore format: no
  const trackStyle = useMemo(() => ({
    '--percent-to': `${(100 / options.length) * (options.findIndex((option) => option.value === value) + 0.5)}%`,
    gridColumn: `span ${options.length} / span ${options.length}`,
  }), [options.findIndex, options.length, value]) as CSSProperties;

  // biome-ignore format: no
  const sendUpdateIfChanged = useCallback((pointer: { clientX: number }) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ix = Utils.clamp(Math.floor(((pointer.clientX - rect.x) / rect.width) * options.length), 0, options.length - 1);
    const nextValue = options[ix].value;
    if (nextValue !== valueRef.current) onValueChange(nextValue);
  }, [onValueChange, options]);

  // biome-ignore format: no
  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 0x0) return;
    sendUpdateIfChanged(event);
  }, [sendUpdateIfChanged]);

  // biome-ignore format: no
  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    sendUpdateIfChanged(event.touches[0]);
  }, [sendUpdateIfChanged]);

  return (
    <div className='flex flex-col gap-2 group'>
      {label && <label htmlFor={id}>{label}</label>}
      <div role='radiogroup' className='grid' style={gridStyle} id={id}>
        {options.map((option) => (
          <RadioSliderOption key={option.value} option={option} onValueChange={onValueChange} />
        ))}
      </div>
      <div
        role='radiogroup'
        className='slider-track relative mb-2 touch-none transition-[--percent-to]'
        onClick={sendUpdateIfChanged}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        style={trackStyle}
        ref={trackRef}
      >
        <Button
          type='button'
          role='radio'
          className='slider-thumb absolute -translate-1/2 top-1/2 pointer-events-none transition-[left,scale]'
          variant='unstyled'
          style={buttonStyle}
        />
      </div>
    </div>
  );
}
