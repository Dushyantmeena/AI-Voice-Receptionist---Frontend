import { describe, expect, it } from "vitest";
import { ApiClientError, getErrorMessage, toApiClientError } from "@/api/apiError";

interface AxiosLikeOptions {
  status?: number;
  data?: unknown;
  code?: string;
  noResponse?: boolean;
}

/** Minimal stand-in for an axios error — `isAxiosError` is the only marker axios checks. */
function axiosLike({ status = 500, data, code, noResponse = false }: AxiosLikeOptions): Error {
  return {
    isAxiosError: true,
    code,
    response: noResponse ? undefined : { status, data },
  } as unknown as Error;
}

describe("toApiClientError", () => {
  it("returns the same instance when the error is already normalised", () => {
    const original = new ApiClientError("conflict", "Already exists", 409);
    expect(toApiClientError(original)).toBe(original);
  });

  it("keeps the backend message and maps the status code", () => {
    const error = toApiClientError(
      axiosLike({ status: 403, data: { message: "Forbidden: Cross-tenant data access is denied" } }),
    );

    expect(error.kind).toBe("forbidden");
    expect(error.status).toBe(403);
    expect(error.message).toBe("Forbidden: Cross-tenant data access is denied");
  });

  it("supports the public chat error shape", () => {
    const error = toApiClientError(axiosLike({ status: 404, data: { error: "Business not found" } }));
    expect(error.kind).toBe("notFound");
    expect(error.message).toBe("Business not found");
  });

  it("falls back to a readable message when the body is empty", () => {
    const error = toApiClientError(axiosLike({ status: 404 }));
    expect(error.kind).toBe("notFound");
    expect(error.message).toBe("The requested record could not be found.");
  });

  it("classifies common statuses", () => {
    expect(toApiClientError(axiosLike({ status: 400 })).kind).toBe("validation");
    expect(toApiClientError(axiosLike({ status: 401 })).kind).toBe("auth");
    expect(toApiClientError(axiosLike({ status: 409 })).kind).toBe("conflict");
    expect(toApiClientError(axiosLike({ status: 422 })).kind).toBe("validation");
    expect(toApiClientError(axiosLike({ status: 503 })).kind).toBe("server");
  });

  it("treats a missing response as a network failure", () => {
    const error = toApiClientError(axiosLike({ noResponse: true }));
    expect(error.kind).toBe("network");
    expect(error.isRetryable).toBe(true);
  });

  it("treats an aborted request as a timeout", () => {
    const error = toApiClientError(axiosLike({ code: "ETIMEDOUT" }));
    expect(error.kind).toBe("timeout");
    expect(error.isRetryable).toBe(true);
  });

  it("wraps plain errors without losing their message", () => {
    const error = toApiClientError(new Error("Kaboom"));
    expect(error.kind).toBe("unknown");
    expect(error.message).toBe("Kaboom");
  });

  it("never leaks a non-error value", () => {
    expect(toApiClientError("something odd").message).toBe("Something went wrong. Please try again.");
  });
});

describe("ApiClientError", () => {
  it("flags authentication failures", () => {
    expect(new ApiClientError("auth", "expired", 401).isAuthError).toBe(true);
    expect(new ApiClientError("forbidden", "denied", 403).isAuthError).toBe(false);
  });

  it("only retries transient kinds", () => {
    expect(new ApiClientError("server", "boom", 500).isRetryable).toBe(true);
    expect(new ApiClientError("validation", "bad input", 400).isRetryable).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("unwraps any error into a string", () => {
    expect(getErrorMessage(axiosLike({ status: 500, data: { message: "Database unavailable" } }))).toBe(
      "Database unavailable",
    );
  });
});
