import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class LocalMirrorService {
  private readonly logger = new Logger(LocalMirrorService.name);
  private readonly storageRoot: string;

  constructor(private readonly config: ConfigService) {
    // MUST match DOCUMENT_STORAGE_PATH in blockchain/services/blockchain-api/.env
    // exactly — both processes need to agree on where files live. In local
    // dev both the backend and blockchain-api run on the host, so a plain
    // shared folder works with no Docker volume needed.
    this.storageRoot = this.config.get<string>('DOCUMENT_STORAGE_PATH') ?? '../shared-storage';
  }

  async mirror(documentId: string, versionId: string, buffer: Buffer): Promise<void> {
    const dir = join(this.storageRoot, documentId);
    const filePath = join(dir, versionId);
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, buffer);
    } catch (err) {
      // Don't fail the whole upload over this — but tamper verification will
      // fail until it's fixed, so this needs to be visible, not silent.
      this.logger.error(
        `Failed to mirror file to ${filePath} — /documents/:id/verify will fail for this document until this is fixed: ${(err as Error).message}`,
      );
    }
  }
}
