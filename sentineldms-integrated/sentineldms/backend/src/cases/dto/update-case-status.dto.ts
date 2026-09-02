import { ApiProperty } from '@nestjs/swagger';
import { CaseStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCaseStatusDto {
  @ApiProperty({ enum: CaseStatus })
  @IsEnum(CaseStatus)
  status: CaseStatus;
}
