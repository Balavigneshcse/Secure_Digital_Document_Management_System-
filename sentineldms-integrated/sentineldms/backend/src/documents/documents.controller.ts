import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator.js';
import { DocumentsService } from './documents.service.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { SearchDocumentsDto } from './dto/search-documents.dto.js';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Declared before ':id' so Nest doesn't try to match a literal id param.
  @Get()
  @ApiOperation({ summary: 'List/filter documents — matches frontend DocumentFilters exactly' })
  findAll(@Query() query: SearchDocumentsDto) {
    return this.documentsService.findAll(query);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Multipart upload — hash, store, AI-classify, blockchain-anchor' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.upload(file, dto.caseId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Single document, frontend DocumentItem shape' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Version history' })
  findVersions(@Param('id') id: string) {
    return this.documentsService.findVersions(id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Re-hash and compare against the blockchain anchor' })
  verify(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.verify(id, user.id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Apply a digital signature via the PKI service' })
  sign(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.sign(id, user.id);
  }
}
