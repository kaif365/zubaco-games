import { IsString, IsPhoneNumber, Length } from 'class-validator';

export class SendOtpDto {
  @IsString()
  phone: string;
}
