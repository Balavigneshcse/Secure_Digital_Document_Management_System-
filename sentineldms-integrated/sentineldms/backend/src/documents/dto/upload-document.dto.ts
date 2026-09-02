import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// Matches the frontend's uploadDocument(file, caseId) — caseId is always sent.
export class UploadDocumentDto {
  @ApiProperty({ description: 'Case to link this document to' })
  @IsString()
  @IsNotEmpty()
  caseId: string;
}
