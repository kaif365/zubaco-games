import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * SEC-S1 (F3): the /auth/link-account body was previously an inline TypeScript
 * type, so the global ValidationPipe (whitelist + forbidNonWhitelisted) had no
 * metadata to validate against — arbitrary/extra fields were accepted. This DTO
 * constrains and strips the payload. NOTE: proof-of-ownership (OTP for phone,
 * verified OAuth token for google/apple) is a separate recommended hardening
 * tracked in the security summary; this DTO only closes the input-validation gap.
 */
export class LinkAccountDto {
  @IsIn(['google', 'apple', 'phone'])
  provider: 'google' | 'apple' | 'phone';

  @IsOptional()
  @IsString()
  @MaxLength(256)
  provider_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;
}
