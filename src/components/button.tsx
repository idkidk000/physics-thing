import type { ComponentProps } from 'react';

export function Button({ children, className, variant = 'default', ...props }: ComponentProps<'button'> & { variant?: 'unstyled' | 'default' }) {
  return (
    <button
      {...props}
      className={`${variant === 'unstyled' ? '' : 'bg-button px-2 py-1 rounded-md border border-border hover:bg-button-hover active:bg-button-active transition-[colors,scale,box-shadow] flex gap-2 shadow items-center hover:scale-102 hover:shadow-md'} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
