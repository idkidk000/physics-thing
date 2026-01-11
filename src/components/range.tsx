import { type ChangeEvent, useCallback, useId } from 'react';

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
