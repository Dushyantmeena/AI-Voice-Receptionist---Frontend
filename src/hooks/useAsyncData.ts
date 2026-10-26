import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { toApiClientError, type ApiClientError } from "@/api/apiError";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncDataResult<T> {
  data: T | null;
  error: ApiClientError | null;
  status: AsyncStatus;
  isLoading: boolean;
  isRefreshing: boolean;
  reload: () => void;
  /** Replaces the cached value without hitting the API. */
  mutate: (updater: (current: T | null) => T | null) => void;
}

interface UseAsyncDataOptions {
  /** Skips the request until the caller has everything it needs (e.g. a route param). */
  enabled?: boolean;
}

/**
 * Minimal data-fetching hook: runs `loader` whenever `deps` change, aborts the
 * in-flight request on unmount/deps change, and exposes a normalised error.
 *
 * The loader is read through a ref so callers can pass an inline arrow without
 * hand-writing `useCallback` on every render.
 */
export function useAsyncData<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: UseAsyncDataOptions = {},
): AsyncDataResult<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [nonce, setNonce] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    let active = true;

    setStatus((previous) => (previous === "success" ? "success" : "loading"));
    setError(null);

    loaderRef.current(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
        setStatus("success");
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(toApiClientError(cause));
        setStatus("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  const reload = useCallback(() => {
    setNonce((value) => value + 1);
  }, []);

  const mutate = useCallback((updater: (current: T | null) => T | null) => {
    setData((current) => updater(current));
  }, []);

  return {
    data,
    error,
    status,
    isLoading: status === "loading",
    isRefreshing: status === "success" && nonce > 0,
    reload,
    mutate,
  };
}
