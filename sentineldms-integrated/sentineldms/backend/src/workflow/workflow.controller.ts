import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator.js';
import { WorkflowService } from './workflow.service.js';
import { CreateWorkflowApprovalDto } from './dto/create-workflow-approval.dto.js';
import { DecideWorkflowApprovalDto } from './dto/decide-workflow-approval.dto.js';

@ApiTags('workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflow/approvals')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @ApiOperation({ summary: 'Start an approval step for a case or document' })
  create(@Body() dto: CreateWorkflowApprovalDto, @CurrentUser() user: RequestUser) {
    return this.workflowService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List approval steps for a case' })
  findForCase(@Query('caseId') caseId: string) {
    return this.workflowService.findForCase(caseId);
  }

  @Put(':id/decision')
  @ApiOperation({ summary: 'Approve or reject a pending approval step' })
  decide(@Param('id') id: string, @Body() dto: DecideWorkflowApprovalDto) {
    return this.workflowService.decide(id, dto);
  }
}
