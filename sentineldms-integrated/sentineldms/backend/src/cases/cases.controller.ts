import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator.js';
import { CasesService } from './cases.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { CreateCaseDto } from './dto/create-case.dto.js';
import { UpdateCaseDto } from './dto/update-case.dto.js';

@ApiTags('cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases')
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all cases — frontend CaseItem[] shape' })
  findAll() {
    return this.casesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create case' })
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: RequestUser) {
    return this.casesService.create(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Case detail' })
  findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Documents linked to this case — frontend DocumentItem[] shape' })
  findDocuments(@Param('id') id: string) {
    return this.documentsService.findByCaseId(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update case (status, title, description)' })
  update(@Param('id') id: string, @Body() dto: UpdateCaseDto) {
    return this.casesService.update(id, dto);
  }
}
