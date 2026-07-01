import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BankAccountType } from '.prisma/client';

/**
 * SEC-S1 (F3): validates the /wallet/bank-details body which was previously an
 * inline type (unvalidated financial payout data). Bounds every field and
 * rejects unknown ones so payout routing data cannot be mass-assigned.
 */
export class AddBankDetailDto {
  @IsEnum(BankAccountType)
  account_type: BankAccountType;

  @IsString()
  @MaxLength(128)
  account_holder: string;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  account_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  ifsc_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  upi_id?: string;
}
