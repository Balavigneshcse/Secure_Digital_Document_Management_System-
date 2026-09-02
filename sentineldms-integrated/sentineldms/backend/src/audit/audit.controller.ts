import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuditService } from './audit.service.js';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('ADMIN', 'JUDGE', 'AUDITOR') // audit trail is sensitive — restrict who can browse it
  @ApiOperation({ summary: 'Filtered audit log — frontend AuditEntry[] shape' })
  @ApiQuery({ name: 'target', required: false, description: 'Filter by resource id' })
  findAll(@Query('target') target?: string) {
    return this.auditService.findAll(target);
  }
}
