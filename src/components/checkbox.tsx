import { type ChangeEvent, useCallback, useId } from 'react';

export function Checkbox({ value, onValueChange, name }: { value: boolean; onValueChange: (value: boolean) => void; name: string }) {
  const id = useId();

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.checked), [onValueChange]);

  return (
    <div className='flex flex-row gap-2 items-center flex-wrap justify-center'>
      <label htmlFor={id} className='grow basis-16'>
        {name}
      </label>
      <input id={id} type='checkbox' checked={value} onChange={handleChange} />
    </div>
  );
}
