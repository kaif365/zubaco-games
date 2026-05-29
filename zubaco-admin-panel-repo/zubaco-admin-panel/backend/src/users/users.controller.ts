import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { UsersService } from './users.service';

@ApiTags('Admin Users')
@ApiBearerAuth('authorization')
@RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    async listUsers(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('status') status?: string,
    ) {
        return this.usersService.listUsers({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            search,
            status,
        });
    }

    @Get(':userId')
    async getUser(@Param('userId') userId: string) {
        return this.usersService.getUserDetail(userId);
    }

    @Get(':userId/history')
    async getUserGameHistory(
        @Param('userId') userId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.usersService.getUserGameHistory(userId, parseInt(page || '1'), parseInt(limit || '20'));
    }

    @Get(':userId/transactions')
    async getUserTransactions(
        @Param('userId') userId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.usersService.getUserTransactions(userId, parseInt(page || '1'), parseInt(limit || '20'));
    }

    @Post(':userId/ban')
    async banUser(@Param('userId') userId: string, @Body() body: { reason: string }) {
        return this.usersService.banUser(userId, body.reason);
    }

    @Post(':userId/unban')
    async unbanUser(@Param('userId') userId: string) {
        return this.usersService.unbanUser(userId);
    }

    @Post(':userId/wallet/credit')
    async creditWallet(@Param('userId') userId: string, @Body() body: { amount: number; reason: string }) {
        return this.usersService.creditWallet(userId, body.amount, body.reason);
    }

    @Post(':userId/wallet/debit')
    async debitWallet(@Param('userId') userId: string, @Body() body: { amount: number; reason: string }) {
        return this.usersService.debitWallet(userId, body.amount, body.reason);
    }

    @Patch(':userId')
    async updateUser(@Param('userId') userId: string, @Body() body: any) {
        return this.usersService.updateUser(userId, body);
    }
}
