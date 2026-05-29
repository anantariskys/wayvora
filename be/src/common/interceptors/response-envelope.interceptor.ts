import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { createRequestId } from '../utils/request-id';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      requestId?: string;
    }>();

    request.requestId ??= createRequestId();

    return next.handle().pipe(
      map((data: unknown) => {
        const hasMeta =
          typeof data === 'object' &&
          data !== null &&
          'data' in data &&
          'meta' in data;

        if (hasMeta) {
          const payload = data as {
            data: unknown;
            meta: Record<string, unknown>;
          };

          return {
            success: true,
            data: payload.data,
            meta: {
              ...payload.meta,
              requestId: request.requestId,
            },
          };
        }

        return {
          success: true,
          data,
          meta: {
            requestId: request.requestId,
          },
        };
      }),
    );
  }
}
