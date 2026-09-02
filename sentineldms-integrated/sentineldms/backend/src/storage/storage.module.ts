import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { LocalMirrorService } from './local-mirror.service.js';

@Global()
@Module({
  providers: [StorageService, LocalMirrorService],
  exports: [StorageService, LocalMirrorService],
})
export class StorageModule {}
