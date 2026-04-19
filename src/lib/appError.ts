export type AppError =
  | TimeoutAppError
  | NetworkAppError
  | HttpAppError
  | ValidationAppError
  | InternalAppError;

export type AppErrorKind =
  | "timeout"
  | "network"
  | "http"
  | "validation"
  | "internal";

export type SupportedLocale = "ja" | "en";

export type UserMessageKey =
  | "error.timeout"
  | "error.network"
  | "error.http.badRequest"
  | "error.http.unauthorized"
  | "error.http.forbidden"
  | "error.http.notFound"
  | "error.http.tooManyRequests"
  | "error.http.server"
  | "error.http.generic"
  | "error.validation"
  | "error.internal";

interface AppErrorBase {
  kind: AppErrorKind;
  /**
   * Developer-facing summary in English.
   * This should not be shown directly to end users.
   */
  message: string;
  cause?: unknown;
  retriable: boolean;
  details?: Record<string, unknown>;
}

export interface TimeoutAppError extends AppErrorBase {
  kind: "timeout";
  timeoutMs: number;
  operation?: string;
}

export interface NetworkAppError extends AppErrorBase {
  kind: "network";
  operation?: string;
  code?: string;
}

export interface HttpAppError extends AppErrorBase {
  kind: "http";
  status: number;
  statusText?: string;
  url?: string;
}

export interface ValidationAppError extends AppErrorBase {
  kind: "validation";
  field?: string;
  expected?: string;
  actual?: unknown;
}

export interface InternalAppError extends AppErrorBase {
  kind: "internal";
}

const USER_MESSAGES: Record<SupportedLocale, Record<UserMessageKey, string>> = {
  ja: {
    "error.timeout":
      "応答に時間がかかりすぎたため、処理を完了できませんでした。",
    "error.network": "ネットワークエラーのため、処理に失敗しました。",
    "error.http.badRequest":
      "リクエストの内容に問題があるため、処理できませんでした。",
    "error.http.unauthorized": "認証が必要なため、処理できませんでした。",
    "error.http.forbidden": "この操作を実行する権限がありません。",
    "error.http.notFound": "対象のデータが見つかりませんでした。",
    "error.http.tooManyRequests":
      "リクエストが多すぎるため、しばらく待ってから再試行してください。",
    "error.http.server":
      "外部サービスでエラーが発生したため、処理に失敗しました。",
    "error.http.generic": "リクエストを正常に処理できませんでした。",
    "error.validation": "受信したデータが不正なため、処理できませんでした。",
    "error.internal": "予期しないエラーが発生しました。",
  },
  en: {
    "error.timeout":
      "The operation could not be completed because it took too long to respond.",
    "error.network": "The operation failed due to a network error.",
    "error.http.badRequest":
      "The request could not be processed because it was invalid.",
    "error.http.unauthorized":
      "Authentication is required to complete this operation.",
    "error.http.forbidden":
      "You do not have permission to perform this operation.",
    "error.http.notFound": "The requested data could not be found.",
    "error.http.tooManyRequests":
      "Too many requests were sent. Please wait and try again later.",
    "error.http.server":
      "The operation failed because an external service returned an error.",
    "error.http.generic": "The request could not be processed successfully.",
    "error.validation":
      "The operation could not be completed because the received data was invalid.",
    "error.internal": "An unexpected error occurred.",
  },
};

export function createTimeoutError(
  message: string,
  timeoutMs: number,
  options: {
    cause?: unknown;
    operation?: string;
    retriable?: boolean;
    details?: Record<string, unknown>;
  } = {},
): TimeoutAppError {
  return {
    kind: "timeout",
    message,
    timeoutMs,
    cause: options.cause,
    operation: options.operation,
    retriable: options.retriable ?? true,
    details: options.details,
  };
}

export function createNetworkError(
  message: string,
  options: {
    cause?: unknown;
    operation?: string;
    code?: string;
    retriable?: boolean;
    details?: Record<string, unknown>;
  } = {},
): NetworkAppError {
  return {
    kind: "network",
    message,
    cause: options.cause,
    operation: options.operation,
    code: options.code,
    retriable: options.retriable ?? true,
    details: options.details,
  };
}

export function createHttpError(
  message: string,
  status: number,
  options: {
    cause?: unknown;
    statusText?: string;
    url?: string;
    retriable?: boolean;
    details?: Record<string, unknown>;
  } = {},
): HttpAppError {
  return {
    kind: "http",
    message,
    status,
    cause: options.cause,
    statusText: options.statusText,
    url: options.url,
    retriable: options.retriable ?? isRetriableHttpStatus(status),
    details: options.details,
  };
}

export function createValidationError(
  message: string,
  options: {
    cause?: unknown;
    field?: string;
    expected?: string;
    actual?: unknown;
    retriable?: boolean;
    details?: Record<string, unknown>;
  } = {},
): ValidationAppError {
  return {
    kind: "validation",
    message,
    cause: options.cause,
    field: options.field,
    expected: options.expected,
    actual: options.actual,
    retriable: options.retriable ?? false,
    details: options.details,
  };
}

export function createInternalError(
  message: string,
  options: {
    cause?: unknown;
    retriable?: boolean;
    details?: Record<string, unknown>;
  } = {},
): InternalAppError {
  return {
    kind: "internal",
    message,
    cause: options.cause,
    retriable: options.retriable ?? false,
    details: options.details,
  };
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AppError>;

  if (typeof candidate.kind !== "string") {
    return false;
  }

  if (typeof candidate.message !== "string") {
    return false;
  }

  if (typeof candidate.retriable !== "boolean") {
    return false;
  }

  switch (candidate.kind) {
    case "timeout":
      return (
        typeof (candidate as Partial<TimeoutAppError>).timeoutMs === "number"
      );

    case "network":
      return true;

    case "http":
      return typeof (candidate as Partial<HttpAppError>).status === "number";

    case "validation":
      return true;

    case "internal":
      return true;

    default:
      return false;
  }
}

export function normalizeUnknownError(
  error: unknown,
  context: {
    defaultMessage?: string;
    operation?: string;
    details?: Record<string, unknown>;
    timeoutMs?: number;
  } = {},
): AppError {
  if (isAppError(error)) {
    return error;
  }

  const defaultMessage = context.defaultMessage ?? "Unexpected error occurred";

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return createTimeoutError(
        defaultMessage === "Unexpected error occurred"
          ? "Request timed out"
          : defaultMessage,
        context.timeoutMs ?? 0,
        {
          cause: error,
          operation: context.operation,
          details: context.details,
        },
      );
    }

    const code = getErrorCode(error);

    if (isLikelyNetworkError(error, code)) {
      return createNetworkError(
        defaultMessage === "Unexpected error occurred"
          ? "Network request failed"
          : defaultMessage,
        {
          cause: error,
          operation: context.operation,
          code,
          details: context.details,
        },
      );
    }

    return createInternalError(error.message || defaultMessage, {
      cause: error,
      details: {
        ...context.details,
        operation: context.operation,
        errorName: error.name,
      },
    });
  }

  return createInternalError(defaultMessage, {
    cause: error,
    details: {
      ...context.details,
      operation: context.operation,
    },
  });
}

export function getUserMessageKey(error: AppError): UserMessageKey {
  switch (error.kind) {
    case "timeout":
      return "error.timeout";

    case "network":
      return "error.network";

    case "http":
      return getHttpUserMessageKey(error.status);

    case "validation":
      return "error.validation";

    case "internal":
      return "error.internal";
  }
}

export function formatUserMessage(
  key: UserMessageKey,
  locale: SupportedLocale = "ja",
): string {
  return USER_MESSAGES[locale][key];
}

export function toUserMessage(
  error: AppError,
  locale: SupportedLocale = "ja",
): string {
  return formatUserMessage(getUserMessageKey(error), locale);
}

export function assertNonNull<T>(
  value: T | null | undefined,
  message = "Value must not be null or undefined",
  options: {
    field?: string;
    details?: Record<string, unknown>;
    expected?: string;
  } = {},
): T {
  if (value == null) {
    throw createValidationError(message, {
      field: options.field,
      expected: options.expected ?? "non-null value",
      actual: value,
      details: options.details,
    });
  }

  return value;
}

export function isRetriableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function getHttpUserMessageKey(status: number): UserMessageKey {
  switch (status) {
    case 400:
      return "error.http.badRequest";
    case 401:
      return "error.http.unauthorized";
    case 403:
      return "error.http.forbidden";
    case 404:
      return "error.http.notFound";
    case 429:
      return "error.http.tooManyRequests";
    default:
      if (status >= 500) {
        return "error.http.server";
      }
      return "error.http.generic";
  }
}

function getErrorCode(error: Error): string | undefined {
  const candidate = error as Error & { code?: unknown };

  return typeof candidate.code === "string" ? candidate.code : undefined;
}

function isLikelyNetworkError(error: Error, code?: string): boolean {
  if (code != null) {
    const knownNetworkCodes = new Set([
      "ECONNRESET",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EHOSTUNREACH",
      "ETIMEDOUT",
      "EAI_AGAIN",
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_SOCKET",
    ]);

    if (knownNetworkCodes.has(code)) {
      return true;
    }
  }

  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();

    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("socket") ||
      message.includes("connection")
    ) {
      return true;
    }
  }

  return false;
}
