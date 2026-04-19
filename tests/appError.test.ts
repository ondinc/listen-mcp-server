import { describe, expect, it } from "vitest";
import {
  assertNonNull,
  createHttpError,
  createInternalError,
  createNetworkError,
  createTimeoutError,
  createValidationError,
  formatUserMessage,
  getUserMessageKey,
  isAppError,
  isRetriableHttpStatus,
  normalizeUnknownError,
  toUserMessage,
  type AppError,
  type HttpAppError,
} from "../src/lib/appError";

describe("createTimeoutError", () => {
  it("creates timeout error with default retriable=true", () => {
    const error = createTimeoutError("Request timed out", 5000);

    expect(error).toEqual({
      kind: "timeout",
      message: "Request timed out",
      timeoutMs: 5000,
      retriable: true,
    });
  });

  it("accepts optional fields", () => {
    const cause = new Error("AbortError");
    const error = createTimeoutError("Request timed out", 3000, {
      cause,
      operation: "fetchEpisodes",
      retriable: false,
      details: { requestId: "abc123" },
    });

    expect(error.kind).toBe("timeout");
    expect(error.message).toBe("Request timed out");
    expect(error.timeoutMs).toBe(3000);
    expect(error.cause).toBe(cause);
    expect(error.operation).toBe("fetchEpisodes");
    expect(error.retriable).toBe(false);
    expect(error.details).toEqual({ requestId: "abc123" });
  });
});

describe("createNetworkError", () => {
  it("creates network error with default retriable=true", () => {
    const error = createNetworkError("Network request failed");

    expect(error).toEqual({
      kind: "network",
      message: "Network request failed",
      retriable: true,
    });
  });

  it("accepts code and operation", () => {
    const error = createNetworkError("Network request failed", {
      code: "ECONNRESET",
      operation: "searchFeed",
    });

    expect(error.code).toBe("ECONNRESET");
    expect(error.operation).toBe("searchFeed");
  });
});

describe("createHttpError", () => {
  it("creates http error with retriable=false for 4xx by default", () => {
    const error = createHttpError("Upstream returned 404", 404);

    expect(error.kind).toBe("http");
    expect(error.message).toBe("Upstream returned 404");
    expect(error.status).toBe(404);
    expect(error.retriable).toBe(false);
  });

  it("creates http error with retriable=true for 5xx by default", () => {
    const error = createHttpError("Upstream returned 503", 503);

    expect(error.status).toBe(503);
    expect(error.retriable).toBe(true);
  });

  it("creates http error with retriable=true for 429 by default", () => {
    const error = createHttpError("Upstream returned 429", 429);

    expect(error.status).toBe(429);
    expect(error.retriable).toBe(true);
  });

  it("accepts optional url and statusText", () => {
    const error = createHttpError("Upstream returned 500", 500, {
      statusText: "Internal Server Error",
      url: "https://example.com/api",
    });

    expect(error.statusText).toBe("Internal Server Error");
    expect(error.url).toBe("https://example.com/api");
  });

  it("allows overriding retriable", () => {
    const error = createHttpError("Upstream returned 503", 503, {
      retriable: false,
    });

    expect(error.retriable).toBe(false);
  });
});

describe("createValidationError", () => {
  it("creates validation error with default retriable=false", () => {
    const error = createValidationError("Episode title is missing");

    expect(error).toEqual({
      kind: "validation",
      message: "Episode title is missing",
      retriable: false,
    });
  });

  it("accepts field, expected and actual", () => {
    const error = createValidationError("Episode title is missing", {
      field: "title",
      expected: "non-empty string",
      actual: null,
    });

    expect(error.field).toBe("title");
    expect(error.expected).toBe("non-empty string");
    expect(error.actual).toBeNull();
  });
});

describe("createInternalError", () => {
  it("creates internal error with default retriable=false", () => {
    const error = createInternalError("Unexpected state");

    expect(error).toEqual({
      kind: "internal",
      message: "Unexpected state",
      retriable: false,
    });
  });

  it("accepts cause and details", () => {
    const cause = new Error("boom");
    const error = createInternalError("Unexpected state", {
      cause,
      details: { phase: "parse" },
    });

    expect(error.cause).toBe(cause);
    expect(error.details).toEqual({ phase: "parse" });
  });
});

describe("isAppError", () => {
  it("returns true for timeout app error", () => {
    const error = createTimeoutError("Request timed out", 5000);

    expect(isAppError(error)).toBe(true);
  });

  it("returns true for network app error", () => {
    const error = createNetworkError("Network request failed");

    expect(isAppError(error)).toBe(true);
  });

  it("returns true for http app error", () => {
    const error = createHttpError("Upstream returned 500", 500);

    expect(isAppError(error)).toBe(true);
  });

  it("returns true for validation app error", () => {
    const error = createValidationError("Invalid payload");

    expect(isAppError(error)).toBe(true);
  });

  it("returns true for internal app error", () => {
    const error = createInternalError("Unexpected state");

    expect(isAppError(error)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isAppError(null)).toBe(false);
  });

  it("returns false for primitive values", () => {
    expect(isAppError("error")).toBe(false);
    expect(isAppError(123)).toBe(false);
    expect(isAppError(true)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });

  it("returns false when required common fields are missing", () => {
    expect(isAppError({ kind: "timeout" })).toBe(false);
    expect(isAppError({ message: "oops" })).toBe(false);
    expect(isAppError({ kind: "internal", message: "oops" })).toBe(false);
  });

  it("returns false for timeout error without timeoutMs", () => {
    expect(
      isAppError({
        kind: "timeout",
        message: "Request timed out",
        retriable: true,
      }),
    ).toBe(false);
  });

  it("returns false for http error without status", () => {
    expect(
      isAppError({
        kind: "http",
        message: "Upstream returned error",
        retriable: false,
      }),
    ).toBe(false);
  });

  it("returns false for unknown kind", () => {
    expect(
      isAppError({
        kind: "custom",
        message: "Custom error",
        retriable: false,
      }),
    ).toBe(false);
  });
});

describe("normalizeUnknownError", () => {
  it("returns app error as-is", () => {
    const original = createValidationError("Invalid payload", {
      field: "title",
    });

    const normalized = normalizeUnknownError(original);

    expect(normalized).toBe(original);
  });

  it("converts AbortError-like Error to timeout error", () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";

    const normalized = normalizeUnknownError(abortError, {
      operation: "fetchEpisodes",
      timeoutMs: 8000,
    });

    expect(normalized.kind).toBe("timeout");
    if (normalized.kind === "timeout") {
      expect(normalized.message).toBe("Request timed out");
      expect(normalized.timeoutMs).toBe(8000);
      expect(normalized.operation).toBe("fetchEpisodes");
      expect(normalized.cause).toBe(abortError);
      expect(normalized.retriable).toBe(true);
    }
  });

  it("uses custom defaultMessage for AbortError", () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";

    const normalized = normalizeUnknownError(abortError, {
      defaultMessage: "Feed request timed out",
      timeoutMs: 2000,
    });

    expect(normalized.kind).toBe("timeout");
    if (normalized.kind === "timeout") {
      expect(normalized.message).toBe("Feed request timed out");
      expect(normalized.timeoutMs).toBe(2000);
    }
  });

  it("converts known network code error to network error", () => {
    const networkError = new Error("connect ECONNRESET");
    Object.assign(networkError, { code: "ECONNRESET" });

    const normalized = normalizeUnknownError(networkError, {
      operation: "searchFeed",
    });

    expect(normalized.kind).toBe("network");
    if (normalized.kind === "network") {
      expect(normalized.message).toBe("Network request failed");
      expect(normalized.code).toBe("ECONNRESET");
      expect(normalized.operation).toBe("searchFeed");
      expect(normalized.cause).toBe(networkError);
      expect(normalized.retriable).toBe(true);
    }
  });

  it("converts TypeError fetch failure to network error", () => {
    const networkError = new TypeError("fetch failed");

    const normalized = normalizeUnknownError(networkError);

    expect(normalized.kind).toBe("network");
    if (normalized.kind === "network") {
      expect(normalized.message).toBe("Network request failed");
      expect(normalized.cause).toBe(networkError);
    }
  });

  it("converts generic Error to internal error", () => {
    const error = new Error("Something went wrong");

    const normalized = normalizeUnknownError(error, {
      operation: "parseFeed",
      details: { requestId: "req-1" },
    });

    expect(normalized.kind).toBe("internal");
    if (normalized.kind === "internal") {
      expect(normalized.message).toBe("Something went wrong");
      expect(normalized.cause).toBe(error);
      expect(normalized.retriable).toBe(false);
      expect(normalized.details).toEqual({
        requestId: "req-1",
        operation: "parseFeed",
        errorName: "Error",
      });
    }
  });

  it("uses defaultMessage for non-Error value", () => {
    const normalized = normalizeUnknownError("boom", {
      defaultMessage: "Unexpected failure in tool",
      operation: "runTool",
      details: { tool: "searchEpisodes" },
    });

    expect(normalized.kind).toBe("internal");
    if (normalized.kind === "internal") {
      expect(normalized.message).toBe("Unexpected failure in tool");
      expect(normalized.cause).toBe("boom");
      expect(normalized.details).toEqual({
        tool: "searchEpisodes",
        operation: "runTool",
      });
    }
  });
});

describe("getUserMessageKey", () => {
  it("returns timeout key", () => {
    const error = createTimeoutError("Request timed out", 5000);

    expect(getUserMessageKey(error)).toBe("error.timeout");
  });

  it("returns network key", () => {
    const error = createNetworkError("Network request failed");

    expect(getUserMessageKey(error)).toBe("error.network");
  });

  it("returns 400 key", () => {
    const error = createHttpError("Upstream returned 400", 400);

    expect(getUserMessageKey(error)).toBe("error.http.badRequest");
  });

  it("returns 401 key", () => {
    const error = createHttpError("Upstream returned 401", 401);

    expect(getUserMessageKey(error)).toBe("error.http.unauthorized");
  });

  it("returns 403 key", () => {
    const error = createHttpError("Upstream returned 403", 403);

    expect(getUserMessageKey(error)).toBe("error.http.forbidden");
  });

  it("returns 404 key", () => {
    const error = createHttpError("Upstream returned 404", 404);

    expect(getUserMessageKey(error)).toBe("error.http.notFound");
  });

  it("returns 429 key", () => {
    const error = createHttpError("Upstream returned 429", 429);

    expect(getUserMessageKey(error)).toBe("error.http.tooManyRequests");
  });

  it("returns 5xx key", () => {
    const error = createHttpError("Upstream returned 503", 503);

    expect(getUserMessageKey(error)).toBe("error.http.server");
  });

  it("returns generic http key for other 4xx", () => {
    const error = createHttpError("Upstream returned 418", 418);

    expect(getUserMessageKey(error)).toBe("error.http.generic");
  });

  it("returns validation key", () => {
    const error = createValidationError("Invalid payload");

    expect(getUserMessageKey(error)).toBe("error.validation");
  });

  it("returns internal key", () => {
    const error = createInternalError("Unexpected state");

    expect(getUserMessageKey(error)).toBe("error.internal");
  });
});

describe("formatUserMessage", () => {
  it("formats Japanese message", () => {
    expect(formatUserMessage("error.timeout", "ja")).toBe(
      "応答に時間がかかりすぎたため、処理を完了できませんでした。",
    );
  });

  it("formats English message", () => {
    expect(formatUserMessage("error.timeout", "en")).toBe(
      "The operation could not be completed because it took too long to respond.",
    );
  });

  it("defaults locale to ja when omitted", () => {
    expect(formatUserMessage("error.internal")).toBe(
      "予期しないエラーが発生しました。",
    );
  });
});

describe("toUserMessage", () => {
  it("returns Japanese timeout message", () => {
    const error = createTimeoutError("Request timed out", 5000);

    expect(toUserMessage(error, "ja")).toBe(
      "応答に時間がかかりすぎたため、処理を完了できませんでした。",
    );
  });

  it("returns English 404 message", () => {
    const error = createHttpError("Upstream returned 404", 404);

    expect(toUserMessage(error, "en")).toBe(
      "The requested data could not be found.",
    );
  });

  it("defaults locale to ja", () => {
    const error = createInternalError("Unexpected state");

    expect(toUserMessage(error)).toBe("予期しないエラーが発生しました。");
  });
});

describe("assertNonNull", () => {
  it("returns value when it is not null or undefined", () => {
    expect(assertNonNull("hello")).toBe("hello");
    expect(assertNonNull(0)).toBe(0);
    expect(assertNonNull(false)).toBe(false);
  });

  it("throws ValidationAppError for null", () => {
    expect(() =>
      assertNonNull(null, "Episode title is missing", {
        field: "title",
      }),
    ).toThrow();

    try {
      assertNonNull(null, "Episode title is missing", {
        field: "title",
      });
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);

      const appError = error as AppError;
      expect(appError.kind).toBe("validation");

      if (appError.kind === "validation") {
        expect(appError.message).toBe("Episode title is missing");
        expect(appError.field).toBe("title");
        expect(appError.expected).toBe("non-null value");
        expect(appError.actual).toBeNull();
        expect(appError.retriable).toBe(false);
      }
    }
  });

  it("throws ValidationAppError for undefined with custom expected value", () => {
    try {
      assertNonNull(undefined, "Feed URL is missing", {
        field: "url",
        expected: "non-empty string",
        details: { source: "config" },
      });
      throw new Error("Expected assertNonNull to throw");
    } catch (error: unknown) {
      expect(isAppError(error)).toBe(true);

      const appError = error as AppError;
      expect(appError.kind).toBe("validation");

      if (appError.kind === "validation") {
        expect(appError.message).toBe("Feed URL is missing");
        expect(appError.field).toBe("url");
        expect(appError.expected).toBe("non-empty string");
        expect(appError.actual).toBeUndefined();
        expect(appError.details).toEqual({ source: "config" });
      }
    }
  });
});

describe("isRetriableHttpStatus", () => {
  it("returns true for 408", () => {
    expect(isRetriableHttpStatus(408)).toBe(true);
  });

  it("returns true for 429", () => {
    expect(isRetriableHttpStatus(429)).toBe(true);
  });

  it("returns true for 5xx", () => {
    expect(isRetriableHttpStatus(500)).toBe(true);
    expect(isRetriableHttpStatus(503)).toBe(true);
  });

  it("returns false for common 4xx", () => {
    expect(isRetriableHttpStatus(400)).toBe(false);
    expect(isRetriableHttpStatus(401)).toBe(false);
    expect(isRetriableHttpStatus(403)).toBe(false);
    expect(isRetriableHttpStatus(404)).toBe(false);
  });
});

describe("AppError narrowing examples", () => {
  it("narrows discriminated union for http error", () => {
    const error: AppError = createHttpError("Upstream returned 502", 502);

    let status: number | undefined;

    if (error.kind === "http") {
      status = error.status;
    }

    expect(status).toBe(502);
  });

  it("narrows discriminated union for timeout error", () => {
    const error: AppError = createTimeoutError("Request timed out", 7000);

    let timeoutMs: number | undefined;

    if (error.kind === "timeout") {
      timeoutMs = error.timeoutMs;
    }

    expect(timeoutMs).toBe(7000);
  });

  it("preserves concrete type compatibility", () => {
    const error: HttpAppError = createHttpError("Upstream returned 500", 500);

    expect(error.kind).toBe("http");
    expect(error.status).toBe(500);
  });
});
