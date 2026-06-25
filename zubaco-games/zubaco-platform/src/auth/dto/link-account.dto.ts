import { IsIn, IsOptional, IsString, IsEmail } from 'class-validator';

export class LinkAccountDto {
  @IsIn(['google', 'apple', 'phone'])
  provider: 'google' | 'apple' | 'phone';

  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
