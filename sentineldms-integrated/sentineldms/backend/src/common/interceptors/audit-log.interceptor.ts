import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, params, user } = request;

    if (!MUTATING_METHODS.has(method) || !user?.id) {
      return next.handle();
    }

    const resourceId = params?.id && UUID_RE.test(params.id) ? params.id : undefined;

    return next.handle().pipe(
      tap(() => {
        // Fire-and-forget — an audit log failure should never fail the actual request.
        this.prisma.auditLog
          .create({
            data: {
              userId: user.id,
              action: `${method} ${url}`,
              resourceType: context.getClass().name.replace('Controller', ''),
              resourceId,
            },
          })
          .catch(() => {
            // Deliberately swallowed — logging failures shouldn't surface to the client.
          });
      }),
    );
  }
}
