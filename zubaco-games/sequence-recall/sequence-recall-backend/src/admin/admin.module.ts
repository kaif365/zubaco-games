import { SessionGuard } from '@common/guards/session.guard';
import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';

import { AdminService } from './admin.service';
import { ConfigController } from './config/config.controller';
import { ConfigService } from './config/config.service';
import { AdminHttpService } from './http/admin-http.service';

@Global()
@Module({
    imports: [HttpModule],
    controllers: [ConfigController],
    providers: [AdminService, AdminHttpService, ConfigService, SessionGuard],
    exports: [AdminService, SessionGuard],
})
export class AdminModule {}
