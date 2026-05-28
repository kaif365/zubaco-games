import { SetMetadata } from '@nestjs/common';
import { HMAC_VERIFY_METADATA } from '../guards/hmac.guard';

export const VerifyHmac = () => SetMetadata(HMAC_VERIFY_METADATA, true);
