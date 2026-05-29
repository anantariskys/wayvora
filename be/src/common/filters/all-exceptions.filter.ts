import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppException } from '../errors/app-exception';
import { createRequestId } from '../utils/request-id';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const request = context.getRequest<{ requestId?: string }>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const details = getErrorDetails(exception, exceptionResponse);

    response.status(status).json({
      success: false,
      error: {
        code: getErrorCode(exception, status),
        message: getErrorMessage(exception, status),
        details,
      },
      meta: {
        requestId: request.requestId ?? createRequestId(),
      },
    });
  }
}

function getErrorCode(exception: unknown, status: number): string {
  if (exception instanceof AppException) {
    return exception.code;
  }

  if (
    exception instanceof HttpException &&
    typeof exception.getResponse() === 'object' &&
    exception.getResponse() !== null &&
    'code' in (exception.getResponse() as Record<string, unknown>)
  ) {
    return String((exception.getResponse() as { code: unknown }).code);
  }

  const codes: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CONFLICT',
    [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
    [HttpStatus.BAD_GATEWAY]: 'MAPBOX_PROVIDER_ERROR',
  };

  return codes[status] ?? 'INTERNAL_SERVER_ERROR';
}

function getErrorDetails(
  exception: unknown,
  exceptionResponse: string | object | null,
): unknown {
  if (exception instanceof AppException) {
    return exception.details;
  }

  if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
    return null;
  }

  if (
    'message' in exceptionResponse &&
    Array.isArray(exceptionResponse.message)
  ) {
    const messages = exceptionResponse.message as unknown[];
    return messages.map((message) => ({
      message: String(message),
    }));
  }

  return exceptionResponse;
}

function getErrorMessage(exception: unknown, status: number): string {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const message = response.message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }

    return exception.message;
  }

  return status === Number(HttpStatus.INTERNAL_SERVER_ERROR)
    ? 'Unexpected server error.'
    : 'Request failed.';
}
