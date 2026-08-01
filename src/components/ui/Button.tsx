'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Shows a spinner and disables the button while true */
  loading?: boolean;
  /** Stretch to fill container width */
  fullWidth?: boolean;
  /** Left-side icon node */
  leftIcon?: React.ReactNode;
  /** Right-side icon node */
  rightIcon?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Variant / size maps
// ---------------------------------------------------------------------------

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 active:opacity-80',
  secondary:
    'bg-[var(--secondary)] text-[var(--secondary-foreground)] border border-[var(--border)] hover:bg-[var(--accent)] active:opacity-80',
  ghost:
    'bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)] active:opacity-80',
  destructive:
    'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 active:opacity-80',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-[var(--radius)]',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-[var(--radius)]',
};

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner({ size }: { size: ButtonSize }) {
  const dim = size === 'sm' ? 12 : size === 'lg' ? 18 : 15;
  return (
    <svg
      aria-hidden="true"
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className="animate-spin shrink-0"
    >
      <path d="M12 2 a10 10 0 0 1 10 10" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Button component
// ---------------------------------------------------------------------------

/**
 * Accessible, Tailwind-styled button.
 *
 * Requirements: 1.5, 21.1, 21.2, 21.3, 21.6
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    children,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={clsx(
        // Base
        'focus-ring inline-flex items-center justify-center font-semibold',
        'transition-all duration-150 select-none cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // Variant
        variantClasses[variant],
        // Size
        sizeClasses[size],
        // Full width
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner size={size} />
          {children}
        </>
      ) : (
        <>
          {leftIcon && <span aria-hidden="true" className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span aria-hidden="true" className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
export default Button;
