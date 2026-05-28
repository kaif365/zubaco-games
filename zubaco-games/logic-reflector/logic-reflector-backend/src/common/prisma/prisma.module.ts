import { config } from "@config";
import { Global, Module } from "@nestjs/common";

import { PrismaService, resolveIPv4 } from "./prisma.service";

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: async () => {
        const { hostname } = new URL(config.database.url);
        const ipv4 = await resolveIPv4(hostname).catch(() => hostname);
        return new PrismaService(ipv4);
      },
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
