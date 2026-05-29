import { SetMetadata } from '@nestjs/common';
import { API_KEY_METADATA } from '../guards/api-key.guard';

export const RequireApiKey = () => SetMetadata(API_KEY_METADATA, true);
