import axios from "axios";

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "auth"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "validation"
  | "server"
  | "unknown";

interface BackendErrorBody {
  success?: boolean;
  statusCode?: number;
  message?: string;
  /** The public chat routes report failures as `{ success: false, error }`. */
  error?: string;
}

/**
 * Normalised error surfaced to the UI layer.
 *
 * The backend has two error shapes: `ApiError` responses
 * (`{ success, statusCode, message, timestamp }`) and raw 500s where the
 * message is intentionally generic. Both are collapsed into this type so
 * components never inspect axios internals.
 */
export class ApiClientError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;

  constructor(kind: ApiErrorKind, message: string, status = 0) {
    super(message);
    this.name = "ApiClientError";
    this.kind = kind;
    this.status = status;
  }

  get isAuthError(): boolean {
    return this.kind === "auth";
  }

  get isRetryable(): boolean {
    return this.kind === "network" || this.kind === "timeout" || this.kind === "server";
  }
}

function kindForStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return "validation";
    case 401:
      return "auth";
    case 403:
      return "forbidden";
    case 404:
      return "notFound";
    case 409:
      return "conflict";
    case 422:
      return "validation";
    default:
      return status >= 500 ? "server" : "unknown";
  }
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request was rejected. Please check the details and try again.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested record could not be found.";
    case 409:
      return "This action conflicts with an existing record.";
    default:
      return "The server could not complete the request. Please try again.";
  }
}

export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiClientError(
        "timeout",
        "The request took too long. Please try again.",
      );
    }

    if (!error.response) {
      return new ApiClientError(
        "network",
        "Cannot reach the server. Check that the backend is running and try again.",
      );
    }

    const status = error.response.status;
    const body = error.response.data as BackendErrorBody | undefined;
    const reported = [body?.message, body?.error].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );
    const message = reported ?? fallbackMessage(status);

    return new ApiClientError(kindForStatus(status), message, status);
  }

  if (error instanceof Error && error.message) {
    return new ApiClientError("unknown", error.message);
  }

  return new ApiClientError("unknown", "Something went wrong. Please try again.");
}

export function getErrorMessage(error: unknown): string {
  return toApiClientError(error).message;
}
