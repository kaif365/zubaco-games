import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { KycDocType } from '.prisma/client';

/**
 * SEC-S1 (F3): validates the /wallet/kyc/submit body which was previously an
 * inline type (unvalidated PII). Bounds every field and rejects unknown ones.
 */
export class SubmitKycDto {
  @IsEnum(KycDocType)
  document_type: KycDocType;

  @IsString()
  @MaxLength(2048)
  document_url: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  document_number?: string;
}
