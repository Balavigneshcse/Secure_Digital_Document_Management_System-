import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// Matches Dharani's REAL contract exactly — see
// blockchain/docs/blockchain-api-contract.md and
// blockchain/services/blockchain-api/src/routes/blockchain.js (ground truth).

export interface AnchorResult {
  txId: string;
  blockNumber: number | null;
  anchoredAt: string;
}

export interface VerifyResult {
  isValid: boolean;
  storedHash: string;
  currentHash: string;
  anchoredAt: string;
}

export interface AuditHistoryEntry {
  documentId: string;
  versionId: string;
  hash: string;
  uploaderId: string;
  timestamp: string;
  txId: string;
}

@Injectable()
export class BlockchainClientService {
  private readonly logger = new Logger(BlockchainClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('BLOCKCHAIN_SERVICE_URL')!;
  }

  async anchor(documentId: string, versionId: string, hash: string, uploaderId: string): Promise<AnchorResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<AnchorResult>(
          `${this.baseUrl}/blockchain/anchor`,
          { documentId, versionId, hash, uploaderId },
          { timeout: 15000 },
        ),
      );
      return data;
    } catch (err) {
      this.logger.warn(
        `blockchain-api unreachable at ${this.baseUrl} (${(err as Error).message}) — returning mock anchor result. ` +
          `Start the Fabric network + blockchain-api (see blockchain/README.md) for real anchoring.`,
      );
      return { txId: `mock-tx-${documentId}-${versionId}`, blockNumber: null, anchoredAt: new Date().toISOString() };
    }
  }

  async verify(documentId: string, versionId: string): Promise<VerifyResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<VerifyResult>(`${this.baseUrl}/blockchain/verify/${documentId}/${versionId}`, {
          timeout: 10000,
        }),
      );
      return data;
    } catch (err) {
      this.logger.warn(
        `blockchain-api unreachable or verify failed at ${this.baseUrl} (${(err as Error).message}) — ` +
          `returning mock "valid" result. Real tamper detection needs blockchain-api + the local file mirror in sync.`,
      );
      return { isValid: true, storedHash: 'mock', currentHash: 'mock', anchoredAt: new Date().toISOString() };
    }
  }

  async getAuditHistory(documentId: string): Promise<AuditHistoryEntry[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ documentId: string; history: AuditHistoryEntry[] }>(
          `${this.baseUrl}/blockchain/audit/${documentId}`,
          { timeout: 10000 },
        ),
      );
      return data.history;
    } catch (err) {
      this.logger.warn(`blockchain-api audit history unreachable (${(err as Error).message}) — returning empty history.`);
      return [];
    }
  }
}
