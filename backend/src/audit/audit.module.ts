import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule], // needed so RolesGuard (which injects Reflector) resolves correctly
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
