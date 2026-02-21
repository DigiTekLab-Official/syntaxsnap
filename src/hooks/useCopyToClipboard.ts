// src/hooks/useCopyToClipboard.ts
import { useState, useCallback, useEffect, useRef, useTransition } from 'react';

// ─── TYPES ───────────────────────────────────────────────────────────────────

/**
 * Discriminated union for clipboard state
 * Enables type-safe state handling and pattern matching
 */
export type ClipboardState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'error'; error: ClipboardError };

export type ClipboardError =
  | { type: 'permission_denied'; message: string }
  | { type: 'not_supported'; message: string }
  | { type: 'write_failed'; message: string }
  | { type: 'invalid_input'; message: string };

export interface UseCopyToClipboardOptions {
  /**
   * Duration in ms before resetting from success/error to idle
   * @default 2000
   */
  timeout?: number;
  
  /**
   * Callback invoked when copy operation starts
   */
  onCopyStart?: (text: string) => void;
  
  /**
   * Callback invoked on successful copy
   */
  onCopySuccess?: (text: string) => void;
  
  /**
   * Callback invoked on copy failure
   */
  onCopyError?: (error: ClipboardError, text: string) => void;
  
  /**
   * Whether to check clipboard permissions before attempting copy
   * @default false
   */
  checkPermissions?: boolean;
}

export interface UseCopyToClipboardReturn {
  /**
   * Current clipboard operation state
   */
  state: ClipboardState;
  
  /**
   * Initiate copy operation (transitions-aware)
   */
  copy: (text: string) => Promise<boolean>;
  
  /**
   * Legacy boolean for backward compatibility
   * @deprecated Use state.status === 'success' instead
   */
  copied: boolean;

  /**
   * The actual text that was successfully copied (required for SyntaxSnap components)
   */
  copiedText: string | null;
  
  /**
   * Whether a copy operation is in progress
   */
  isPending: boolean;
  
  /**
   * Reset state to idle
   */
  reset: () => void;
}

// ─── GUARDS ──────────────────────────────────────────────────────────────────

/**
 * SSR-safe check for clipboard API availability
 */
function isClipboardSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'clipboard' in navigator &&
    typeof navigator.clipboard?.writeText === 'function'
  );
}

/**
 * Check clipboard write permission (Permissions API)
 */
async function checkClipboardPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.permissions) {
    return true; // Assume allowed if Permissions API unavailable
  }
  
  try {
    const result = await navigator.permissions.query({
      name: 'clipboard-write' as PermissionName,
    });
    return result.state === 'granted' || result.state === 'prompt';
  } catch {
    return true; // Fallback: assume allowed
  }
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

/**
 * Production-grade clipboard hook with:
 * - React 19 transitions for non-blocking UI
 * - Proper cleanup and memory safety
 * - SSR/hydration safety
 * - Comprehensive error handling
 * - Permission pre-checks
 * - Observability hooks
 * - Race condition prevention
 * * @example
 * ```tsx
 * const { copy, copiedText, isPending } = useCopyToClipboard();
 * * <button onClick={() => copy(content)} disabled={isPending}>
 * {copiedText === content ? 'Copied!' : 'Copy'}
 * </button>
 * ```
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const {
    timeout = 2000,
    onCopyStart,
    onCopySuccess,
    onCopyError,
    checkPermissions = false,
  } = options;

  const [state, setState] = useState<ClipboardState>({ status: 'idle' });
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  // Track active timeout for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track current operation to prevent race conditions
  const operationIdRef = useRef(0);

  // ─── CLEANUP ───────────────────────────────────────────────────────────────

  useEffect(() => {
    // Cleanup on unmount only
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []); // Empty deps - only cleanup on unmount

  // ─── RESET FUNCTION ────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState({ status: 'idle' });
    setCopiedText(null);
  }, []);

  // ─── COPY FUNCTION ─────────────────────────────────────────────────────────

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // Input validation
      if (!text || typeof text !== 'string') {
        const error: ClipboardError = {
          type: 'invalid_input',
          message: 'Text must be a non-empty string',
        };
        setState({ status: 'error', error });
        setCopiedText(null);
        onCopyError?.(error, text);
        return false;
      }

      // SSR guard
      if (!isClipboardSupported()) {
        const error: ClipboardError = {
          type: 'not_supported',
          message: 'Clipboard API not available in this environment',
        };
        setState({ status: 'error', error });
        setCopiedText(null);
        onCopyError?.(error, text);
        return false;
      }

      // Clear any pending timeout to prevent stale resets
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Increment operation ID to handle race conditions
      const currentOperationId = ++operationIdRef.current;

      // Check permissions if requested
      if (checkPermissions) {
        const hasPermission = await checkClipboardPermission();
        if (!hasPermission) {
          const error: ClipboardError = {
            type: 'permission_denied',
            message: 'Clipboard write permission denied',
          };
          setState({ status: 'error', error });
          setCopiedText(null);
          onCopyError?.(error, text);
          return false;
        }
      }

      // Start operation
      setState({ status: 'pending' });
      onCopyStart?.(text);

      try {
        await navigator.clipboard.writeText(text);
        
        // Only update if this is still the current operation
        if (currentOperationId === operationIdRef.current) {
          startTransition(() => {
            setState({ status: 'success' });
            setCopiedText(text);
          });
          onCopySuccess?.(text);

          // Schedule reset
          timeoutRef.current = setTimeout(() => {
            if (currentOperationId === operationIdRef.current) {
              startTransition(() => {
                setState({ status: 'idle' });
                setCopiedText(null);
              });
            }
            timeoutRef.current = null;
          }, timeout);
        }
        return true;
      } catch (err: unknown) {
        if (currentOperationId === operationIdRef.current) {
          const error: ClipboardError = {
            type: 'write_failed',
            message: err instanceof Error ? err.message : 'Failed to write to clipboard',
          };
          startTransition(() => {
            setState({ status: 'error', error });
            setCopiedText(null);
          });
          onCopyError?.(error, text);

          timeoutRef.current = setTimeout(() => {
            if (currentOperationId === operationIdRef.current) {
              startTransition(() => {
                setState({ status: 'idle' });
                setCopiedText(null);
              });
            }
            timeoutRef.current = null;
          }, timeout);
        }
        return false;
      }
    },
    [timeout, onCopyStart, onCopySuccess, onCopyError, checkPermissions]
  );

  // ─── RETURN ────────────────────────────────────────────────────────────────

  return {
    state,
    copy,
    copied: state.status === 'success',
    copiedText,
    isPending,
    reset,
  };
}