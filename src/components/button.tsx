import type { ComponentProps } from 'react';

const variants = {
  unstyled: '',
  default:
    'button-bg px-2 py-1 rounded-full border border-border transition-[background,scale,box-shadow,--bg] flex gap-2 shadow items-center hover:scale-102 hover:shadow-md',
  accent:
    'button-bg-accent px-2 py-1 rounded-full border border-border transition-[background,scale,box-shadow,--bg] flex gap-2 shadow items-center hover:scale-102 hover:shadow-md',
} as const;

type ButtonVariant = keyof typeof variants;

export function Button({ children, className, variant = 'default', ...props }: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return (
    <button {...props} className={`${variants[variant]} ${className ?? ''}`}>
      {children}
    </button>
  );
}
