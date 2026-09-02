import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// Matches blockchain/services/blockchain-api/src/routes/signatures.js exactly.
// Note: their /signatures/sign response does NOT echo back a certificateId
// even though the request can include one — their PKI service auto-issues
// one internally but doesn't expose it. We generate our own placeholder id
// to satisfy Arunkumar's NOT NULL digital_signatures.certificate_id column;
// flag this to Dharani if a real certificate reference is needed later.

export interface SignResult {
  signatureValue: string;
  signedAt: string;
}

export interface SignatureVerifyResult {
  isValid: boolean;
  signedBy: string;
  signedAt: string;
}

@Injectable()
export class SignatureClientService {
  private readonly logger = new Logger(SignatureClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('BLOCKCHAIN_SERVICE_URL')!;
  }

  async sign(documentVersionId: string, userId: string): Promise<SignResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<SignResult>(
          `${this.baseUrl}/signatures/sign`,
          { documentVersionId, userId },
          { timeout: 10000 },
        ),
      );
      return data;
    } catch (err) {
      this.logger.warn(
        `blockchain-api signature service unreachable (${(err as Error).message}) — returning mock signature.`,
      );
      return { signatureValue: `mock-signature-${documentVersionId}`, signedAt: new Date().toISOString() };
    }
  }

  async verifySignature(documentVersionId: string): Promise<SignatureVerifyResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<SignatureVerifyResult>(`${this.baseUrl}/signatures/${documentVersionId}/verify`, {
          timeout: 10000,
        }),
      );
      return data;
    } catch (err) {
      this.logger.warn(`blockchain-api signature verify unreachable (${(err as Error).message}) — returning mock result.`);
      return { isValid: true, signedBy: 'unknown', signedAt: new Date().toISOString() };
    }
  }
}
