import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req   = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next:  () => this.logger.log(`${req.method} ${req.url} - ${Date.now() - start}ms`),
        error: (e) => this.logger.error(`${req.method} ${req.url} - ${Date.now() - start}ms | ${e.message}`),
      }),
    );
  }
}
