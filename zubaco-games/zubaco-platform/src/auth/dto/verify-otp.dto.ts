import { IsString, IsOptional } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  phone: string;

  @IsString()
  otp: string;

  @IsOptional()
  @IsString()
  device_id?: string;
}
