'use client';
import React, { forwardRef } from 'react';
import { Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useCopyToClipboard, type UseCopyToClipboardOptions } from '../../hooks/useCopyToClipboard';
import { clsx } from 'clsx';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type CopyButtonVariant = 'primary' | 'ghost' | 'outline' | 'minimal';
export type CopyButtonSize = 'sm' | 'md' | 'lg';

export interface CopyButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /**
   * Text content to copy to clipboard
   */
  text: string;
  
  /**
   * Button label when in idle state
   * @default 'Copy'
   */
  label?: string;
  
  /**
   * Button label when copy succeeds
   * @default 'Copied'
   */
  copiedLabel?: string;
  
  /**
   * Button label when copy fails
   * @default 'Failed'
   */
  errorLabel?: string;
  
  /**
   * Visual variant
   * @default 'primary'
   */
  variant?: CopyButtonVariant;
  
  /**
   * Button size
   * @default 'md'
   */
  size?: CopyButtonSize;
  
  /**
   * Show icon
   * @default true
   */
  showIcon?: boolean;
  
  /**
   * Show label text
   * @default true
   */
  showLabel?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Hook options for advanced control
   */
  hookOptions?: UseCopyToClipboardOptions;
  
  /**
   * Custom aria-label (overrides default)
   */
  'aria-label'?: string;
}

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────

/**
 * Centralized design tokens for maintainability and consistency
 * These should ideally come from a design system
 */
const BUTTON_STYLES = {
  base: 'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  
  sizes: {
    sm: 'text-xs px-2 py-1 rounded',
    md: 'text-xs px-3 py-1.5 rounded-md',
    lg: 'text-sm px-4 py-2 rounded-lg',
  },
  
  iconSizes: {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  },
  
  variants: {
    primary: {
      idle: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 focus:ring-indigo-500',
      success: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/50 focus:ring-emerald-500',
      error: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/50 focus:ring-red-500',
      pending: 'bg-indigo-600/70 text-white cursor-wait',
    },
    ghost: {
      idle: 'text-slate-400 hover:text-white hover:bg-slate-800/50 focus:ring-slate-500',
      success: 'text-emerald-400 hover:text-emerald-300 focus:ring-emerald-500',
      error: 'text-red-400 hover:text-red-300 focus:ring-red-500',
      pending: 'text-slate-400 cursor-wait',
    },
    outline: {
      idle: 'border border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600 focus:ring-slate-500',
      success: 'border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 focus:ring-emerald-500',
      error: 'border border-red-500/50 text-red-400 bg-red-500/10 focus:ring-red-500',
      pending: 'border border-slate-700 text-slate-400 cursor-wait',
    },
    minimal: {
      idle: 'text-slate-500 hover:text-slate-300 focus:ring-slate-500',
      success: 'text-emerald-400 focus:ring-emerald-500',
      error: 'text-red-400 focus:ring-red-500',
      pending: 'text-slate-500 cursor-wait',
    },
  },
} as const;

// ─── COMPONENT ───────────────────────────────────────────────────────────────

/**
 * Production-grade CopyButton component with:
 * - Full accessibility (WCAG 2.2 AA+)
 * - SSR/hydration safety via 'use client'
 * - Ref forwarding for composition
 * - Comprehensive state management
 * - Design system alignment
 * - Error state visualization
 * - Loading states
 * - Keyboard navigation
 * - Screen reader announcements
 * 
 * @example
 * ```tsx
 * <CopyButton 
 *   text={code}
 *   variant="outline"
 *   hookOptions={{
 *     onCopySuccess: () => toast.success('Copied!'),
 *     checkPermissions: true
 *   }}
 * />
 * ```
 */
export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      text,
      label = 'Copy',
      copiedLabel = 'Copied',
      errorLabel = 'Failed',
      variant = 'primary',
      size = 'md',
      showIcon = true,
      showLabel = true,
      className,
      hookOptions,
      disabled,
      'aria-label': ariaLabel,
      ...restProps
    },
    ref
  ) => {
    const { state, copy, isPending } = useCopyToClipboard(hookOptions);

    // ─── DERIVED STATE ─────────────────────────────────────────────────────

    const isDisabled = disabled || !text || isPending;
    const isIdle = state.status === 'idle';
    const isSuccess = state.status === 'success';
    const isError = state.status === 'error';

    // ─── RENDER HELPERS ────────────────────────────────────────────────────

    const getIcon = () => {
      if (!showIcon) return null;
      
      const iconClass = BUTTON_STYLES.iconSizes[size];
      
      if (isPending) return <Loader2 className={clsx(iconClass, 'animate-spin')} aria-hidden="true" />;
      if (isSuccess) return <Check className={iconClass} aria-hidden="true" />;
      if (isError) return <AlertCircle className={iconClass} aria-hidden="true" />;
      return <Copy className={iconClass} aria-hidden="true" />;
    };

    const getLabel = () => {
      if (!showLabel) return null;
      if (isSuccess) return copiedLabel;
      if (isError) return errorLabel;
      return label;
    };

    const getVariantStyles = () => {
      if (isPending) return BUTTON_STYLES.variants[variant].pending;
      if (isSuccess) return BUTTON_STYLES.variants[variant].success;
      if (isError) return BUTTON_STYLES.variants[variant].error;
      return BUTTON_STYLES.variants[variant].idle;
    };

    const getAriaLabel = () => {
      if (ariaLabel) return ariaLabel;
      if (isSuccess) return `${copiedLabel} - text copied to clipboard`;
      if (isError) return `${errorLabel} - failed to copy to clipboard`;
      return `${label} - copy text to clipboard`;
    };

    // ─── EVENT HANDLERS ────────────────────────────────────────────────────

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      await copy(text);
    };

    // ─── RENDER ────────────────────────────────────────────────────────────

    return (
      <>
        <button
          ref={ref}
          type="button"
          onClick={handleClick}
          disabled={isDisabled}
          aria-label={getAriaLabel()}
          aria-disabled={isDisabled}
          className={clsx(
            BUTTON_STYLES.base,
            BUTTON_STYLES.sizes[size],
            getVariantStyles(),
            className
          )}
          {...restProps}
        >
          {getIcon()}
          {getLabel()}
        </button>
        
        {/* Screen reader only live region for better announcements */}
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {isSuccess && `${copiedLabel}. Content copied to clipboard.`}
          {isError && state.status === 'error' && `${errorLabel}. ${state.error.message}`}
        </span>
      </>
    );
  }
);

CopyButton.displayName = 'CopyButton';

export default CopyButton;