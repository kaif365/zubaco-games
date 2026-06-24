import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { SettingsService } from './settings.service';

interface UpdateSettingsDto {
  settings: Array<{ key: string; value: string }>;
}

@ApiTags('Admin Settings')
@ApiBearerAuth('authorization')
@RequireSession({
  tokenTypes: [TOKEN_TYPES.LOGIN],
  userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAll() {
    return this.settingsService.getAll();
  }

  @Put()
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateMany(dto.settings);
  }
}
