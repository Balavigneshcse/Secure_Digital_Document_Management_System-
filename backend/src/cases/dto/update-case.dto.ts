import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

// Matches the frontend's PATCH /cases/:id — currently only ever sends
// `status`, using its 3-value CaseStatus union.
export class UpdateCaseDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'UNDER_REVIEW', 'CLOSED'] })
  @IsOptional()
  @IsIn(['OPEN', 'UNDER_REVIEW', 'CLOSED'])
  status?: 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
