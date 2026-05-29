import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface Banner {
  id: string;
  title: string;
  body: string;
  image_url: string;
  action_url: string;
  active: boolean;
  priority: number;
  start_date: Date;
  end_date: Date;
  created_at: Date;
}

// TODO: use Prisma when banner model is added to schema
@Injectable()
export class BannersService {
  private banners: Banner[] = [];

  async create(data: Omit<Banner, 'id' | 'created_at'>): Promise<Banner> {
    const banner: Banner = {
      ...data,
      id: randomUUID(),
      created_at: new Date(),
    };
    this.banners.push(banner);
    return banner;
  }

  async findAll(): Promise<Banner[]> {
    return this.banners;
  }

  async findOne(id: string): Promise<Banner> {
    const banner = this.banners.find((b) => b.id === id);
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async findActive(): Promise<Banner[]> {
    const now = new Date();
    return this.banners
      .filter(
        (b) =>
          b.active &&
          new Date(b.start_date) <= now &&
          new Date(b.end_date) >= now,
      )
      .sort((a, b) => a.priority - b.priority);
  }

  async update(id: string, data: Partial<Omit<Banner, 'id' | 'created_at'>>): Promise<Banner> {
    const index = this.banners.findIndex((b) => b.id === id);
    if (index === -1) throw new NotFoundException('Banner not found');
    this.banners[index] = { ...this.banners[index], ...data };
    return this.banners[index];
  }

  async remove(id: string): Promise<void> {
    const index = this.banners.findIndex((b) => b.id === id);
    if (index === -1) throw new NotFoundException('Banner not found');
    this.banners.splice(index, 1);
  }
}
