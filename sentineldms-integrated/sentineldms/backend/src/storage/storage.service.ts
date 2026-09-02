import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET')!;
    this.client = new Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT')!,
      port: Number(this.config.get<string>('MINIO_PORT')),
      useSSL: this.config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY')!,
      secretKey: this.config.get<string>('MINIO_SECRET_KEY')!,
    });
  }

  // Creates the bucket on first boot so the team doesn't need a manual MinIO console step.
  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created MinIO bucket "${this.bucket}"`);
      }
    } catch (err) {
      this.logger.warn(
        `Could not reach MinIO at startup (${(err as Error).message}). ` +
          `Is "docker compose up" running? Upload calls will fail until it is.`,
      );
    }
  }

  // Returns the storage key to persist on the Document/DocumentVersion row.
  async uploadBuffer(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    const key = `${randomUUID()}-${originalName}`;
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return key;
  }

  // Short-lived signed URL for GET /documents/:id to hand back to the frontend.
  getSignedUrl(storageKey: string, expirySeconds = 300): Promise<string> {
    return this.client.presignedGetObject(this.bucket, storageKey, expirySeconds);
  }
}
