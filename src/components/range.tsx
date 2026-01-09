import { type ChangeEvent, type CSSProperties, useCallback, useId } from 'react';

export function Range({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  name,
  unit = '',
  style,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  name: string;
  unit?: string;
  style?: CSSProperties;
}) {
  const id = useId();

  const decimals = Math.max(0, 0 - Math.floor(Math.log10(step)));

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.valueAsNumber), [onValueChange]);

  return (
    <div className='flex flex-row gap-2 items-center flex-wrap justify-center'>
      <label htmlFor={id} className='grow basis-16'>
        {name}
      </label>
      <input id={id} type='range' min={min} max={max} step={step} value={value} onChange={handleChange} style={style} />
      <span className='grow basis-0'>{`${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${unit}`}</span>
    </div>
  );
}
