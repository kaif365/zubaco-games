import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';

import { BannersService } from './banners.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';

@ApiTags('Admin Banners')
@ApiBearerAuth('authorization')
@RequireSession({
  tokenTypes: [TOKEN_TYPES.LOGIN],
  userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  async create(@Body() body: CreateBannerDto) {
    return this.bannersService.create(body);
  }

  @Get()
  async findAll() {
    return this.bannersService.findAll();
  }

  @Get('active')
  async findActive() {
    return this.bannersService.findActive();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateBannerDto) {
    return this.bannersService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.bannersService.remove(id);
    return { message: 'Banner deleted' };
  }
}
