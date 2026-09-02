import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Matches the frontend's createCase() payload exactly — it does not send a
// case number (we generate one) or a status (always starts 'open').
export class CreateCaseDto {
  @ApiProperty({ example: 'Theft — MG Road branch' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Officer name or user id — best-effort matched; left unassigned if not found' })
  @IsOptional()
  @IsString()
  assignedOfficer?: string;
}
