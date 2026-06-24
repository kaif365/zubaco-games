import { IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  id_token: string;
}
