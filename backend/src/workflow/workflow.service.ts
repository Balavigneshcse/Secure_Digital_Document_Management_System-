import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkflowApprovalDto } from './dto/create-workflow-approval.dto.js';
import { DecideWorkflowApprovalDto } from './dto/decide-workflow-approval.dto.js';

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkflowApprovalDto, initiatedById: string) {
    if (!dto.caseId && !dto.documentId) {
      throw new BadRequestException('Either caseId or documentId is required');
    }

    const workflow = await this.prisma.workflow.create({
      data: {
        caseId: dto.caseId,
        documentId: dto.documentId,
        initiatedById,
        assignedToId: dto.assignedToId,
        workflowType: dto.workflowType,
      },
    });

    const targetCase = dto.caseId ? await this.prisma.case.findUnique({ where: { id: dto.caseId } }) : null;

    await this.prisma.notification.create({
      data: {
        userId: dto.assignedToId,
        type: 'signature_requested',
        title: 'Approval requested',
        message: targetCase
          ? `You have a case pending your review: ${targetCase.caseNumber}`
          : `You have a document pending your review`,
        relatedResourceType: dto.caseId ? 'case' : 'document',
        relatedResourceId: dto.caseId ?? dto.documentId,
      },
    });

    return workflow;
  }

  findForCase(caseId: string) {
    return this.prisma.workflow.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decide(id: string, dto: DecideWorkflowApprovalDto) {
    const existing = await this.prisma.workflow.findUnique({
      where: { id },
      include: { case: true },
    });
    if (!existing) throw new NotFoundException(`Workflow ${id} not found`);

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNote: dto.resolutionNote,
        resolvedAt: new Date(),
      },
    });

    if (existing.case) {
      await this.prisma.notification.create({
        data: {
          userId: existing.initiatedById,
          type: dto.status === 'approved' ? 'workflow_approved' : 'workflow_rejected',
          title: `Case ${dto.status}`,
          message: `Case ${existing.case.caseNumber} was ${dto.status}`,
          relatedResourceType: 'case',
          relatedResourceId: existing.caseId ?? undefined,
        },
      });
    }

    return updated;
  }
}
