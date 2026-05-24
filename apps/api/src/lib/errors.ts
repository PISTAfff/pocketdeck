/**
 * API error primitives shared by every route + middleware.
 *
 * Status codes / error codes mirror CONTRACT.md exactly. The `asEnvelope`
 * helper produces the wire shape from `packages/types`.
 */
import type { ApiErrorResponse, ApiFieldError } from '@pocketdeck/types';

export const ErrorCode = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  RATE_LIMITED: 'RATE_LIMITED',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ErrorCodeValue;
  public readonly fieldErrors?: ApiFieldError[];

  constructor(
    status: number,
    code: ErrorCodeValue,
    message: string,
    fieldErrors?: ApiFieldError[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  static notFound(message = 'Resource not found.'): ApiError {
    return new ApiError(404, ErrorCode.NOT_FOUND, message);
  }

  static validation(message: string, fieldErrors: ApiFieldError[]): ApiError {
    return new ApiError(422, ErrorCode.VALIDATION_ERROR, message, fieldErrors);
  }

  static outOfStock(
    message = 'Selected configuration is out of stock.',
  ): ApiError {
    return new ApiError(409, ErrorCode.OUT_OF_STOCK, message);
  }

  static rateLimited(message = 'Too many requests from this IP.'): ApiError {
    return new ApiError(429, ErrorCode.RATE_LIMITED, message);
  }

  static badRequest(message = 'Bad request.'): ApiError {
    return new ApiError(400, ErrorCode.BAD_REQUEST, message);
  }

  static unauthorized(message = 'Authentication required.'): ApiError {
    return new ApiError(401, ErrorCode.UNAUTHORIZED, message);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable.'): ApiError {
    return new ApiError(503, ErrorCode.SERVICE_UNAVAILABLE, message);
  }

  static internal(message = 'Internal server error.'): ApiError {
    return new ApiError(500, ErrorCode.INTERNAL, message);
  }
}

export function asEnvelope(err: ApiError): ApiErrorResponse {
  const envelope: ApiErrorResponse = {
    error: {
      code: err.code,
      message: err.message,
    },
  };
  if (err.code === ErrorCode.VALIDATION_ERROR && err.fieldErrors) {
    envelope.error.errors = err.fieldErrors;
  }
  return envelope;
}
