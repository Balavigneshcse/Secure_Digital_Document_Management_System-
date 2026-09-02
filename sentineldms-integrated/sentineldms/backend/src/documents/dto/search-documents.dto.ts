import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Matches the frontend's DocumentFilters exactly: { query, caseId, type, status }
export class SearchDocumentsDto {
  @ApiPropertyOptional({ description: 'Free-text search over title, case title, case number' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caseId?: string;

  @ApiPropertyOptional({ description: 'Display type, e.g. "Witness Statement", or the raw enum value' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ['VERIFIED', 'TAMPERED', 'PENDING_SIGNATURE', 'UNSIGNED'] })
  @IsOptional()
  @IsString()
  status?: string;
}
