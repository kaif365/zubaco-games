import { Controller, Get } from '@nestjs/common';

@Controller('app')
export class AppVersionController {
  @Get('version')
  getVersion() {
    return {
      min_version: process.env.APP_MIN_VERSION || '1.0.0',
      latest_version: process.env.APP_LATEST_VERSION || '1.0.0',
      force_update: false,
      update_url: {
        android: 'https://play.google.com/store/apps/details?id=com.zubaco.app',
        ios: 'https://apps.apple.com/app/zubaco/id0000000000',
      },
    };
  }
}
