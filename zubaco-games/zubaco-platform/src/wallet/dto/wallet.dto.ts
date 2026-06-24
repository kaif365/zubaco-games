import { IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';

export class CreateDepositOrderDto {
  @IsNumber()
  @Min(10, { message: 'Minimum deposit is ₹10' })
  @Max(100000, { message: 'Maximum deposit is ₹1,00,000' })
  amount: number;
}

export class VerifyDepositDto {
  @IsString()
  order_id: string;

  @IsString()
  payment_id: string;

  @IsString()
  signature: string;
}

export class WithdrawDto {
  @IsNumber()
  @Min(100, { message: 'Minimum withdrawal is ₹100' })
  @Max(50000, { message: 'Maximum withdrawal is ₹50,000' })
  amount: number;
}

export class ConfirmWithdrawalDto {
  @IsString()
  withdrawal_id: string;

  @IsString()
  otp: string;
}
