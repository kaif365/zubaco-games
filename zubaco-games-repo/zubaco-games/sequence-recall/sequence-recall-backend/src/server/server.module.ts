import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ServerController } from './server.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [ServerController],
  providers: [PrismaHealthIndicator],
})
export class ServerModule {}