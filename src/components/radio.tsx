import { type CSSProperties, useCallback, useId, useMemo, useRef } from 'react';
import { Button } from '@/components/button';
import { Switch } from '@/components/switch';

interface Option {
  value: number;
  label: string;
}

function RadioOption({ option, value, onValueChange }: { option: Option; value: number; onValueChange: (value: number) => void }) {
  // biome-ignore format: no
  const handleChange = useCallback((checked: boolean) => {
    if (checked) onValueChange(option.value);
  }, [onValueChange, option.value]);

  return <Switch label={option.label} value={value === option.value} onValueChange={handleChange} role='radio' />;
}

export function Radio({ value, onValueChange, label, options }: { value: number; onValueChange: (value: number) => void; label: string; options: Option[] }) {
  const id = useId();
  return (
    <div className='flex flex-col gap-2'>
      <label htmlFor={id} className='inline-flex'>
        {label}
      </label>
      {/** biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: no */}
      <fieldset className='flex flex-row gap-4 items-center justify-between' role='radiogroup' id={id}>
        {options.map((option) => (
          <RadioOption key={option.value} option={option} value={value} onValueChange={onValueChange} />
        ))}
      </fieldset>
    </div>
  );
}

function RadioOption2({ option, onValueChange }: { option: Option; onValueChange: (value: number) => void }) {
  const handleClick = useCallback(() => onValueChange(option.value), [onValueChange, option.value]);
  return (
    <Button role='radio' type='button' onClick={handleClick} className='flex justify-center h-12' variant='unstyled'>
      {option.label}
    </Button>
  );
}

export function Radio2({ value, onValueChange, label, options }: { value: number; onValueChange: (value: number) => void; label?: string; options: Option[] }) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);

  // biome-ignore format: no
  const gridStyle: CSSProperties = useMemo(() => ({
    gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
  }), [options]);

  // biome-ignore format: no
  const buttonStyle: CSSProperties = useMemo(() => ({
    left: `${(100 / options.length) * (options.findIndex((option) => option.value === value) + 0.5)}%`,
  }), [value, options]);

  return (
    <div className='flex flex-col gap-2 group'>
      {label && <label htmlFor={id}>{label}</label>}
      <div role='radiogroup' className='grid' style={gridStyle} id={id}>
        {options.map((option) => (
          <RadioOption2 key={option.value} option={option} onValueChange={onValueChange} />
        ))}
      </div>
      <div role='radiogroup' className='slider-track col-span-3 relative -mt-6 pointer-events-none bg-border'>
        <Button
          type='button'
          role='radio'
          className='slider-thumb absolute -translate-1/2 top-1/2 transition-[left]'
          ref={ref}
          variant='unstyled'
          style={buttonStyle}
        />
      </div>
    </div>
  );
}
