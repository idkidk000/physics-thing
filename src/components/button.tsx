import type { ComponentProps } from 'react';

const variants = {
  unstyled: '',
  default:
    'bg-button px-2 py-1 rounded-md border border-border hover:bg-button-hover active:bg-button-active transition-[background-color,scale,box-shadow] flex gap-2 shadow items-center hover:scale-102 hover:shadow-md',
  danger:
    'bg-danger/75 px-2 py-1 rounded-md border border-border hover:bg-danger/85 active:bg-danger transition-[background-color,scale,box-shadow] flex gap-2 shadow items-center hover:scale-102 hover:shadow-md',
  accent:
    'bg-accent/75 px-2 py-1 rounded-md border border-border hover:bg-accent/85 active:bg-accent transition-[background-color,scale,box-shadow] flex gap-2 shadow items-center hover:scale-102 hover:shadow-md',
} as const;

type ButtonVariant = keyof typeof variants;

export function Button({ children, className, variant = 'default', ...props }: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return (
    <button {...props} className={`${variants[variant]} ${className ?? ''}`}>
      {children}
    </button>
  );
}
