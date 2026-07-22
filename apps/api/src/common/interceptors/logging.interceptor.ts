import { randomUUID } from 'crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// Attaches a correlation id to every request and logs method/path/status/duration. The
// correlation id is propagated Web -> API -> Agent Orchestrator -> Agent -> LLM call
// (Solution Architecture §26) via the `x-correlation-id` response header and AgentRun.correlationId.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const correlationId = request.headers['x-correlation-id'] ?? randomUUID();
    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        this.logger.log(
          `${method} ${url} ${response.statusCode} +${durationMs}ms [${correlationId}]`,
        );
      }),
    );
  }
}
