import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CaseStatus as DbCaseStatus, Prisma } from '@prisma/client';
import { CreateCaseDto } from './dto/create-case.dto.js';
import { UpdateCaseDto } from './dto/update-case.dto.js';

export type FrontendCaseStatus = 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';

// The frontend's CaseStatus union has 3 values; Arunkumar's case_status enum
// has 6 (open, under_investigation, pending_review, closed, archived,
// reopened). This is the agreed collapsing between the two — 'reopened'
// folds into OPEN and 'archived' folds into CLOSED for display purposes.
// The underlying DB value is preserved exactly; only the API-facing shape
// is collapsed.
const DB_TO_FRONTEND_STATUS: Record<DbCaseStatus, FrontendCaseStatus> = {
  open: 'OPEN',
  reopened: 'OPEN',
  under_investigation: 'UNDER_REVIEW',
  pending_review: 'UNDER_REVIEW',
  closed: 'CLOSED',
  archived: 'CLOSED',
};

const FRONTEND_TO_DB_STATUS: Record<FrontendCaseStatus, DbCaseStatus> = {
  OPEN: DbCaseStatus.open,
  UNDER_REVIEW: DbCaseStatus.under_investigation,
  CLOSED: DbCaseStatus.closed,
};

type CaseWithRelations = Prisma.CaseGetPayload<{
  include: { assignedTo: true; _count: { select: { documents: true } } };
}>;

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeForDto = {
    assignedTo: true,
    _count: { select: { documents: true } },
  } satisfies Prisma.CaseInclude;

  toCaseItemDto(c: CaseWithRelations) {
    return {
      id: c.id,
      title: c.title,
      status: DB_TO_FRONTEND_STATUS[c.status],
      assignedOfficer: c.assignedTo?.name ?? '',
      documentCount: c._count.documents,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      description: c.description ?? '',
    };
  }

  async findAll() {
    const cases = await this.prisma.case.findMany({
      include: this.includeForDto,
      orderBy: { createdAt: 'desc' },
    });
    return cases.map((c) => this.toCaseItemDto(c));
  }

  async findOne(id: string) {
    const found = await this.prisma.case.findUnique({ where: { id }, include: this.includeForDto });
    if (!found) throw new NotFoundException(`Case ${id} not found`);
    return this.toCaseItemDto(found);
  }

  // Best-effort resolve a display name or user id to a user id. Returns
  // undefined (left unassigned) rather than throwing — a fuzzy name match
  // failing shouldn't block creating the case.
  private async resolveAssignee(assignedOfficer?: string): Promise<string | undefined> {
    if (!assignedOfficer) return undefined;
    const byId = await this.prisma.user.findUnique({ where: { id: assignedOfficer } }).catch(() => null);
    if (byId) return byId.id;
    const byName = await this.prisma.user.findFirst({
      where: { name: { equals: assignedOfficer, mode: 'insensitive' } },
    });
    return byName?.id;
  }

  private generateCaseNumber(): string {
    const year = new Date().getFullYear();
    const suffix = Date.now().toString().slice(-6);
    return `CR-${year}-GEN-${suffix}`;
  }

  async create(dto: CreateCaseDto, createdById: string) {
    const assignedToId = await this.resolveAssignee(dto.assignedOfficer);
    const created = await this.prisma.case.create({
      data: {
        caseNumber: this.generateCaseNumber(),
        title: dto.title,
        description: dto.description,
        createdById,
        assignedToId,
      },
      include: this.includeForDto,
    });
    return this.toCaseItemDto(created);
  }

  async update(id: string, dto: UpdateCaseDto) {
    await this.findOne(id); // 404s early if missing

    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        ...(dto.status ? { status: FRONTEND_TO_DB_STATUS[dto.status] } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
      include: this.includeForDto,
    });
    return this.toCaseItemDto(updated);
  }
}
