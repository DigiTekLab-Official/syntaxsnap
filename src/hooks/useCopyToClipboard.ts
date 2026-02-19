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
  copy: (text: string) => Promise<void>;
  
  /**
   * Legacy boolean for backward compatibility
   * @deprecated Use state.status === 'success' instead
   */
  copied: boolean;
  
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
 * 
 * @example
 * ```tsx
 * const { copy, state, isPending } = useCopyToClipboard({
 *   onCopySuccess: (text) => analytics.track('copy', { text }),
 *   onCopyError: (error) => logger.error('Copy failed', error)
 * });
 * 
 * <button onClick={() => copy(content)} disabled={isPending}>
 *   {state.status === 'success' ? 'Copied!' : 'Copy'}
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
  const [isPending, startTransition] = useTransition();
  
  // Track active timeout for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track current operation to prevent race conditions
  const operationIdRef = useRef(0);

  // ─── CLEANUP ───────────────────────────────────────────────────────────────

  useEffect(() => {
    // Cleanup on unmount or when timeout changes
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [timeout]);

  // ─── RESET FUNCTION ────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState({ status: 'idle' });
  }, []);

  // ─── COPY FUNCTION ─────────────────────────────────────────────────────────

  const copy = useCallback(
    async (text: string): Promise<void> => {
      // Input validation
      if (!text || typeof text !== 'string') {
        const error: ClipboardError = {
          type: 'invalid_input',
          message: 'Text must be a non-empty string',
        };
        setState({ status: 'error', error });
        onCopyError?.(error, text);
        return;
      }

      // SSR guard
      if (!isClipboardSupported()) {
        const error: ClipboardError = {
          type: 'not_supported',
          message: 'Clipboard API not available in this environment',
        };
        setState({ status: 'error', error });
        onCopyError?.(error, text);
        return;
      }

      // Clear any pending timeout
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
          onCopyError?.(error, text);
          return;
        }
      }

      // Start operation
      setState({ status: 'pending' });
      onCopyStart?.(text);

      // Use transition to prevent blocking UI
      startTransition(() => {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            // Only update if this is still the current operation
            if (currentOperationId === operationIdRef.current) {
              setState({ status: 'success' });
              onCopySuccess?.(text);

              // Schedule reset
              timeoutRef.current = setTimeout(() => {
                if (currentOperationId === operationIdRef.current) {
                  setState({ status: 'idle' });
                }
                timeoutRef.current = null;
              }, timeout);
            }
          })
          .catch((err: unknown) => {
            // Only update if this is still the current operation
            if (currentOperationId === operationIdRef.current) {
              const error: ClipboardError = {
                type: 'write_failed',
                message: err instanceof Error ? err.message : 'Failed to write to clipboard',
              };
              setState({ status: 'error', error });
              onCopyError?.(error, text);

              // Schedule reset
              timeoutRef.current = setTimeout(() => {
                if (currentOperationId === operationIdRef.current) {
                  setState({ status: 'idle' });
                }
                timeoutRef.current = null;
              }, timeout);
            }
          });
      });
    },
    [timeout, onCopyStart, onCopySuccess, onCopyError, checkPermissions]
  );

  // ─── RETURN ────────────────────────────────────────────────────────────────

  return {
    state,
    copy,
    copied: state.status === 'success', // Backward compatibility
    isPending,
    reset,
  };
}