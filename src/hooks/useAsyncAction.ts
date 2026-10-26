import { useCallback, useRef, useState } from "react";
import { toApiClientError, type ApiClientError } from "@/api/apiError";

export interface AsyncActionResult<Args extends unknown[], R> {
  run: (...args: Args) => Promise<R>;
  isPending: boolean;
  error: ApiClientError | null;
  reset: () => void;
}

/**
 * Wraps a mutation so components get consistent pending/error state without
 * repeating try/catch/finally. Errors are re-thrown after being normalised so
 * the caller can still branch on failure.
 */
export function useAsyncAction<Args extends unknown[], R>(
  action: (...args: Args) => Promise<R>,
): AsyncActionResult<Args, R> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args: Args): Promise<R> => {
    setIsPending(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (cause) {
      setError(toApiClientError(cause));
      throw cause;
    } finally {
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { run, isPending, error, reset };
}
