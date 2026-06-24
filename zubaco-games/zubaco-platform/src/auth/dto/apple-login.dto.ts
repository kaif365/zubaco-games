import { IsString, IsOptional } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  identity_token: string;

  @IsOptional()
  @IsString()
  name?: string;
}
