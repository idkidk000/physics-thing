import type { ComponentProps } from 'react';

const base =
  'button-bg px-2 py-[0.25lh] rounded-full border border-border transition-[background,scale,box-shadow,--bg] flex gap-2 shadow items-center hover:scale-102 hover:shadow-md';

const variants = {
  unstyled: '',
  default: `${base} [--bg:hsl(from_var(--color-utility)_h_s_l_/_25%)] hover:[--bg:hsl(from_var(--color-utility)_h_s_l_/_50%)] active:[--bg:hsl(from_var(--color-utility)_h_s_l_/_75%)]`,
  accent: `${base} [--bg:hsl(from_var(--color-accent)_h_s_l_/_80%)] hover:[--bg:hsl(from_var(--color-accent)_h_s_l_/_90%)] active:[--bg:var(--color-accent)] dark:text-background`,
} as const;

type ButtonVariant = keyof typeof variants;

export function Button({ children, className, variant = 'default', ...props }: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return (
    <button {...props} className={`${variants[variant]} ${className ?? ''}`}>
      {children}
    </button>
  );
}
