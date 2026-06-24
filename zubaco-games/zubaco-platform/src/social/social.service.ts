import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import * as crypto from 'crypto';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  // ─── FRIENDS ───────────────────────────────────────────────────

  async sendFriendRequest(userId: string, friendUsername: string) {
    const friend = await this.prisma.user.findUnique({ where: { username: friendUsername } });
    if (!friend) throw new NotFoundException('User not found');
    if (friend.id === userId) throw new BadRequestException('Cannot friend yourself');

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { user_id: userId, friend_id: friend.id },
          { user_id: friend.id, friend_id: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'BLOCKED') throw new BadRequestException('User is blocked');
      throw new ConflictException('Friend request already exists');
    }

    await this.prisma.friendship.create({
      data: { user_id: userId, friend_id: friend.id, status: 'PENDING' },
    });

    return { message: 'Friend request sent' };
  }

  async acceptFriendRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: { id: friendshipId, friend_id: userId, status: 'PENDING' },
    });
    if (!friendship) throw new NotFoundException('Friend request not found');

    await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
    });

    return { message: 'Friend request accepted' };
  }

  async removeFriend(userId: string, friendId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
      },
    });
    return { message: 'Friend removed' };
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { user_id: userId, status: 'ACCEPTED' },
          { friend_id: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        user: { select: { id: true, username: true, display_name: true, avatar_url: true, level: true } },
        friend: { select: { id: true, username: true, display_name: true, avatar_url: true, level: true } },
      },
    });

    return friendships.map((f) => (f.user_id === userId ? f.friend : f.user));
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { friend_id: userId, status: 'PENDING' },
      include: {
        user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
      },
    });
  }

  // ─── REFERRALS ─────────────────────────────────────────────────

  async generateReferralCode(userId: string): Promise<string> {
    // Check if user already has referrals (use first 8 chars of user ID as code)
    const code = `ZUB${userId.substring(0, 6).toUpperCase()}`;
    return code;
  }

  async applyReferralCode(userId: string, code: string) {
    // Find referrer by code pattern
    const codePrefix = code.substring(3, 9).toLowerCase();
    const referrer = await this.prisma.user.findFirst({
      where: { id: { startsWith: codePrefix } },
    });

    if (!referrer) throw new NotFoundException('Invalid referral code');
    if (referrer.id === userId) throw new BadRequestException('Cannot refer yourself');

    // Check if already referred
    const existing = await this.prisma.referral.findUnique({ where: { referee_id: userId } });
    if (existing) throw new ConflictException('Already used a referral code');

    const referral = await this.prisma.referral.create({
      data: {
        referrer_id: referrer.id,
        referee_id: userId,
        referral_code: code,
      },
    });

    // Credit bonus to both
    await this.walletService.creditReferralBonus(referrer.id, referral.id);
    await this.walletService.creditReferralBonus(userId, referral.id);

    return { message: 'Referral code applied! Both users received bonus.' };
  }

  // ─── SCORE SHARING ─────────────────────────────────────────────

  async generateShareLink(userId: string, sessionId: string, gameType: string, score: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, display_name: true },
    });

    const shareCode = Buffer.from(`${sessionId}:${userId}`).toString('base64url').slice(0, 12);
    const shareUrl = `https://zubaco.com/share/${shareCode}`;

    return {
      share_url: shareUrl,
      share_text: `I scored ${score} in ${gameType.replace(/_/g, ' ')} on Zubaco! Can you beat my score? ${shareUrl}`,
      share_data: {
        title: `${user?.display_name || user?.username} scored ${score}!`,
        game_type: gameType,
        score,
        url: shareUrl,
      },
    };
  }
}
