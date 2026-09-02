import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { RoleCode } from '../auth.service.js';

// The exact shape JwtStrategy.validate() attaches to req.user.
export type RequestUser = User & { role: { name: string }; roleCode: RoleCode };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
