import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiClientService } from './ai-client.service.js';
import { BlockchainClientService } from './blockchain-client.service.js';
import { SignatureClientService } from './signature-client.service.js';

@Global()
@Module({
  imports: [HttpModule],
  providers: [AiClientService, BlockchainClientService, SignatureClientService],
  exports: [AiClientService, BlockchainClientService, SignatureClientService, HttpModule],
})
export class IntegrationsModule {}
