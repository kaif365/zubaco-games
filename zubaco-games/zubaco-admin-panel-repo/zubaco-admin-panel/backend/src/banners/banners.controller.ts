import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';

import { BannersService, Banner } from './banners.service';

@Controller('admin/banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  async create(@Body() body: Omit<Banner, 'id' | 'created_at'>) {
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
  async update(@Param('id') id: string, @Body() body: Partial<Omit<Banner, 'id' | 'created_at'>>) {
    return this.bannersService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.bannersService.remove(id);
    return { message: 'Banner deleted' };
  }
}
