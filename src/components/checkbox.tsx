/** biome-ignore-all lint/a11y/useSemanticElements: no */
import { useCallback, useId, useRef, useState } from 'react';

enum CheckboxState {
  Unchecked,
  Checked,
  Unchecking,
}

export function Checkbox({ value, onValueChange, name }: { value: boolean; onValueChange: (value: boolean) => void; name: string }) {
  const id = useId();
  const [state, setState] = useState(value ? CheckboxState.Checked : CheckboxState.Unchecked);
  const timeoutRef = useRef<number | null>(null);

  const handleClick = useCallback(() => {
    onValueChange(!value);
    setState(value ? CheckboxState.Unchecking : CheckboxState.Checked);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (value) timeoutRef.current = setTimeout(() => setState(CheckboxState.Unchecked), 300);
  }, [onValueChange, value]);

  return (
    <div className='flex flex-row gap-2 items-center flex-wrap'>
      <label htmlFor={id} className='grow'>
        {name}
      </label>
      <button
        id={id}
        type='button'
        className='size-4.5 m-0 p-0 justify-center transition-colors overflow-hidden bg-background text-foreground aria-checked:bg-accent aria-checked:text-background'
        onClick={handleClick}
        role='checkbox'
        aria-checked={value}
      >
        {state !== CheckboxState.Unchecked && (
          <svg
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            aria-description='checked'
            role='graphics-symbol'
            className={`starting:-translate-y-1/2 starting:scale-200 transition-[translate,scale] ${state === CheckboxState.Unchecking ? 'translate-y-2/3 scale-200' : ''}`}
          >
            <path d='M20 6 9 17l-5-5' />
          </svg>
        )}
      </button>
    </div>
  );
}
