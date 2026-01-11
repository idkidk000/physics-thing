/** biome-ignore-all lint/a11y/useSemanticElements: no */

import { useCallback, useId } from 'react';
import { Button } from '@/components/button';

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

  const handleClick = useCallback(() => onValueChange(!value), [onValueChange, value]);

  return (
    <div className='flex flex-row gap-4 items-center flex-wrap'>
      <label htmlFor={id}>{label}</label>
      <Button
        id={id}
        type='button'
        className='h-4 w-10 rounded-full m-0 p-0 justify-center transition-colors bg-background aria-checked:bg-accent group border-2  text-foreground'
        onClick={handleClick}
        role={role}
        aria-checked={value}
        variant='default'
      >
        <span className='slider-thumb -translate-x-1/2 transition-[translate,scale] group-aria-checked:translate-x-1/2' />
      </Button>
    </div>
  );
}
