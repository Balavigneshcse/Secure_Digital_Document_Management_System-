import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateWorkflowApprovalDto {
  @ApiPropertyOptional({ description: 'Case this approval step belongs to (case or document required)' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ description: 'Document this approval step belongs to (case or document required)' })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiProperty({ description: 'User who needs to approve/reject' })
  @IsString()
  @IsNotEmpty()
  assignedToId: string;

  @ApiProperty({ example: 'chargesheet_review' })
  @IsString()
  @IsNotEmpty()
  workflowType: string;
}
