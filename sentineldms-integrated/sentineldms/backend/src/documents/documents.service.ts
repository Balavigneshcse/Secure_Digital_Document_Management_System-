import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { LocalMirrorService } from '../storage/local-mirror.service.js';
import { AiClientService } from '../integrations/ai-client.service.js';
import { BlockchainClientService } from '../integrations/blockchain-client.service.js';
import { SignatureClientService } from '../integrations/signature-client.service.js';
import { DOC_TYPE_TO_DISPLAY, formatFileSize, toDocumentType } from './document-mappings.js';
import { SearchDocumentsDto } from './dto/search-documents.dto.js';

// The 4-state view the frontend renders — derived, not stored directly.
export type FrontendDocumentStatus = 'VERIFIED' | 'TAMPERED' | 'PENDING_SIGNATURE' | 'UNSIGNED';

const documentDtoInclude = {
  case: { select: { title: true } },
  uploadedBy: { select: { name: true } },
  currentVersion: {
    include: {
      tamperChecks: { orderBy: { checkedAt: 'desc' as const }, take: 1 },
      blockchainAnchors: { orderBy: { anchoredAt: 'desc' as const }, take: 1 },
      aiClassifications: { orderBy: { processedAt: 'desc' as const }, take: 1 },
    },
  },
} satisfies Prisma.DocumentInclude;

type DocumentWithRelations = Prisma.DocumentGetPayload<{ include: typeof documentDtoInclude }>;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly localMirror: LocalMirrorService,
    private readonly ai: AiClientService,
    private readonly blockchain: BlockchainClientService,
    private readonly signatures: SignatureClientService,
  ) {}

  private computeStatus(doc: DocumentWithRelations): FrontendDocumentStatus {
    const latestTamperCheck = doc.currentVersion?.tamperChecks[0];
    if (latestTamperCheck?.isTampered) return 'TAMPERED';
    if (doc.signatureStatus === 'signed') return 'VERIFIED';
    if (doc.signatureStatus === 'pending') return 'PENDING_SIGNATURE';
    return 'UNSIGNED';
  }

  toDocumentItemDto(doc: DocumentWithRelations) {
    const latestAnchor = doc.currentVersion?.blockchainAnchors[0];
    const latestClassification = doc.currentVersion?.aiClassifications[0];

    return {
      id: doc.id,
      title: doc.title,
      caseId: doc.caseId,
      caseTitle: doc.case.title,
      type: DOC_TYPE_TO_DISPLAY[doc.documentType],
      status: this.computeStatus(doc),
      uploadedBy: doc.uploadedBy.name,
      uploadedAt: doc.createdAt.toISOString(),
      fileSize: doc.currentVersion ? formatFileSize(doc.currentVersion.fileSize) : '0 B',
      classificationConfidence: latestClassification?.confidenceScore
        ? Math.round(Number(latestClassification.confidenceScore) * 100)
        : undefined,
      blockchainHash: latestAnchor?.anchoredHash,
    };
  }

  private async findWithRelationsOrThrow(id: string): Promise<DocumentWithRelations> {
    const doc = await this.prisma.document.findUnique({ where: { id }, include: documentDtoInclude });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async findAll(filters: SearchDocumentsDto) {
    const where: Prisma.DocumentWhereInput = {
      AND: [
        filters.caseId ? { caseId: filters.caseId } : {},
        filters.type ? { documentType: toDocumentType(filters.type) } : {},
        filters.query
          ? {
              OR: [
                { title: { contains: filters.query, mode: 'insensitive' } },
                { case: { title: { contains: filters.query, mode: 'insensitive' } } },
                { case: { caseNumber: { contains: filters.query, mode: 'insensitive' } } },
              ],
            }
          : {},
      ],
    };

    const docs = await this.prisma.document.findMany({
      where,
      include: documentDtoInclude,
      orderBy: { createdAt: 'desc' },
    });

    const dtos = docs.map((d) => this.toDocumentItemDto(d));
    // Status is derived, not a DB column, so it's filtered in-memory —
    // fine at hackathon scale; move to a computed column/view if this
    // dataset grows large.
    return filters.status ? dtos.filter((d) => d.status === filters.status) : dtos;
  }

  async findOne(id: string) {
    return this.toDocumentItemDto(await this.findWithRelationsOrThrow(id));
  }

  async findByCaseId(caseId: string) {
    const docs = await this.prisma.document.findMany({
      where: { caseId },
      include: documentDtoInclude,
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => this.toDocumentItemDto(d));
  }

  async findVersions(id: string) {
    await this.findWithRelationsOrThrow(id);
    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId: id },
      include: { createdBy: { select: { name: true } } },
      orderBy: { versionNumber: 'asc' },
    });
    return versions.map((v) => ({
      version: v.versionNumber,
      changedBy: v.createdBy.name,
      changedAt: v.createdAt.toISOString(),
      note: v.changeNotes ?? '',
    }));
  }

  // The full pipeline: hash -> MinIO + local mirror -> AI classify -> chain
  // anchor -> persist Document/DocumentVersion/BlockchainAnchor/AiClassification
  // /OcrResult/ChainOfCustody rows.
  async upload(file: Express.Multer.File, caseId: string, uploaderId: string) {
    const targetCase = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!targetCase) throw new NotFoundException(`Case ${caseId} not found`);

    const documentId = randomUUID();
    const versionUuid = randomUUID();
    const versionNumber = 1;
    const blockchainVersionId = String(versionNumber); // the identifier blockchain-api's file-path resolution uses

    const fileHash = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = await this.storage.uploadBuffer(file.buffer, file.originalname, file.mimetype);
    await this.localMirror.mirror(documentId, blockchainVersionId, file.buffer);

    const [aiResult, anchorResult] = await Promise.all([
      this.ai.ocrAndClassify(file.buffer, file.originalname, file.mimetype),
      this.blockchain.anchor(documentId, blockchainVersionId, fileHash, uploaderId),
    ]);

    const documentType = toDocumentType(aiResult.docType);

    await this.prisma.$transaction([
      this.prisma.document.create({
        data: {
          id: documentId,
          caseId,
          title: file.originalname,
          documentType,
          uploadedById: uploaderId,
          ocrProcessed: true,
          aiClassified: true,
        },
      }),
      this.prisma.documentVersion.create({
        data: {
          id: versionUuid,
          documentId,
          versionNumber,
          filePath: storageKey,
          fileHash,
          fileSize: BigInt(file.buffer.length),
          mimeType: file.mimetype,
          originalFilename: file.originalname,
          createdById: uploaderId,
        },
      }),
      this.prisma.document.update({
        where: { id: documentId },
        data: { currentVersionId: versionUuid },
      }),
      this.prisma.blockchainAnchor.create({
        data: {
          documentVersionId: versionUuid,
          txId: anchorResult.txId,
          blockNumber: anchorResult.blockNumber ? BigInt(anchorResult.blockNumber) : null,
          anchoredHash: fileHash,
          anchoredAt: new Date(anchorResult.anchoredAt),
        },
      }),
      this.prisma.ocrResult.create({
        data: { documentVersionId: versionUuid, extractedText: aiResult.ocrText },
      }),
      this.prisma.aiClassification.create({
        data: {
          documentId,
          documentVersionId: versionUuid,
          predictedType: documentType,
          extractedEntities: aiResult.entities as Prisma.InputJsonValue,
        },
      }),
      this.prisma.chainOfCustody.create({
        data: { documentId, handlerId: uploaderId, action: 'created' },
      }),
    ]);

    if (targetCase.assignedToId && targetCase.assignedToId !== uploaderId) {
      await this.prisma.notification.create({
        data: {
          userId: targetCase.assignedToId,
          type: 'document_uploaded',
          title: 'New document uploaded',
          message: `A new document "${file.originalname}" was uploaded to case ${targetCase.caseNumber}`,
          relatedResourceType: 'document',
          relatedResourceId: documentId,
        },
      });
    }

    return {
      id: documentId,
      classification: DOC_TYPE_TO_DISPLAY[documentType],
      confidence: 85, // mock AI doesn't return a real confidence score yet — see ai-client.service.ts
      ocrText: aiResult.ocrText,
    };
  }

  // Calls blockchain-api's real hash-recompute-and-compare endpoint and
  // persists the result as a tamper_checks row (Arunkumar's schema — this
  // is what powers the "TAMPERED" badge on future reads, and is the row the
  // seeded tamper-detection demo document already has one of).
  async verify(id: string, checkedById: string) {
    const doc = await this.findWithRelationsOrThrow(id);
    if (!doc.currentVersion) throw new NotFoundException(`Document ${id} has no current version to verify`);

    const versionNumber = doc.currentVersion.versionNumber;
    const result = await this.blockchain.verify(doc.id, String(versionNumber));
    const latestAnchor = doc.currentVersion.blockchainAnchors[0];

    await this.prisma.tamperCheck.create({
      data: {
        documentVersionId: doc.currentVersion.id,
        blockchainAnchorId: latestAnchor?.id,
        checkedById,
        currentHash: result.currentHash,
        anchoredHash: result.storedHash,
        isTampered: !result.isValid,
      },
    });

    if (!result.isValid) {
      await this.prisma.notification.create({
        data: {
          userId: doc.uploadedById,
          type: 'tamper_detected',
          title: 'Tamper detected',
          message: `Document "${doc.title}" failed integrity verification — the stored file no longer matches its blockchain anchor.`,
          relatedResourceType: 'document',
          relatedResourceId: doc.id,
        },
      });
    }

    return { verified: result.isValid, hash: result.currentHash };
  }

  // Calls blockchain-api's PKI/signature service and persists the result.
  async sign(id: string, signedById: string) {
    const doc = await this.findWithRelationsOrThrow(id);
    if (!doc.currentVersion) throw new NotFoundException(`Document ${id} has no current version to sign`);

    // Matches Dharani's own example format ("DOC-001_v1") for this endpoint's
    // combined identifier — see blockchain/docs/blockchain-api-contract.md.
    const documentVersionId = `${doc.id}_v${doc.currentVersion.versionNumber}`;
    const result = await this.signatures.sign(documentVersionId, signedById);

    await this.prisma.$transaction([
      this.prisma.digitalSignature.create({
        data: {
          documentVersionId: doc.currentVersion.id,
          signedById,
          // blockchain-api's /signatures/sign response doesn't echo back a
          // certificateId (see signature-client.service.ts) — generating a
          // placeholder to satisfy the NOT NULL column until that's fixed.
          certificateId: `cert-${signedById}-${Date.now()}`,
          signatureValue: result.signatureValue,
          signedAt: new Date(result.signedAt),
        },
      }),
      this.prisma.document.update({
        where: { id: doc.id },
        data: { signatureStatus: 'signed' },
      }),
      this.prisma.chainOfCustody.create({
        data: { documentId: doc.id, handlerId: signedById, action: 'signed' },
      }),
    ]);

    return { signed: true };
  }
}
