import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { GameType } from '.prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ChallengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── CREATE CHALLENGE ──────────────────────────────────────────

  async createChallenge(challengerId: string, opponentId: string, gameType: GameType, level = 5) {
    // Verify they are friends
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { user_id: challengerId, friend_id: opponentId },
          { user_id: opponentId, friend_id: challengerId },
        ],
      },
    });

    if (!friendship) {
      throw new BadRequestException('You can only challenge friends');
    }

    // Check no pending challenge between them for same game
    const existing = await this.prisma.challenge.findFirst({
      where: {
        challenger_id: challengerId,
        opponent_id: opponentId,
        game_type: gameType,
        status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
      },
    });

    if (existing) {
      throw new BadRequestException('You already have an active challenge with this friend for this game');
    }

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const challenge = await this.prisma.challenge.create({
      data: {
        challenger_id: challengerId,
        opponent_id: opponentId,
        game_type: gameType,
        level,
        server_seed: serverSeed,
        expires_at: expiresAt,
      },
    });

    // Notify opponent
    await this.notificationService.sendNotification(
      opponentId,
      'CHALLENGE',
      'New Challenge!',
      `You've been challenged to ${gameType.replace(/_/g, ' ')}! Accept and play to compare scores.`,
      { challenge_id: challenge.id, game_type: gameType },
    );

    return challenge;
  }

  // ─── ACCEPT CHALLENGE ──────────────────────────────────────────

  async acceptChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, opponent_id: userId, status: 'PENDING' },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found or already accepted');
    }

    if (challenge.expires_at < new Date()) {
      await this.prisma.challenge.update({
        where: { id: challengeId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Challenge has expired');
    }

    await this.prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'ACCEPTED' },
    });

    return { success: true, challenge_id: challengeId };
  }

  // ─── DECLINE CHALLENGE ─────────────────────────────────────────

  async declineChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, opponent_id: userId, status: 'PENDING' },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    await this.prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'DECLINED' },
    });

    return { success: true };
  }

  // ─── SUBMIT CHALLENGE SCORE ────────────────────────────────────

  async submitChallengeScore(userId: string, challengeId: string, sessionId: string, score: number) {
    const challenge = await this.prisma.challenge.findFirst({
      where: {
        id: challengeId,
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
        OR: [{ challenger_id: userId }, { opponent_id: userId }],
      },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found or not active');
    }

    const isChallenger = challenge.challenger_id === userId;
    const update: any = { status: 'IN_PROGRESS' };

    if (isChallenger) {
      update.challenger_score = score;
      update.challenger_session_id = sessionId;
    } else {
      update.opponent_score = score;
      update.opponent_session_id = sessionId;
    }

    // Check if both have played
    const otherScoreExists = isChallenger ? challenge.opponent_score !== null : challenge.challenger_score !== null;

    if (otherScoreExists) {
      update.status = 'COMPLETED';
      update.completed_at = new Date();
    }

    await this.prisma.challenge.update({
      where: { id: challengeId },
      data: update,
    });

    // Notify other player
    const otherUserId = isChallenger ? challenge.opponent_id : challenge.challenger_id;
    if (otherScoreExists) {
      const challengerScore = isChallenger ? score : challenge.challenger_score!;
      const opponentScore = isChallenger ? challenge.opponent_score! : score;
      const winner = challengerScore > opponentScore ? challenge.challenger_id : challenge.opponent_id;

      await this.notificationService.sendNotification(
        otherUserId,
        'CHALLENGE',
        'Challenge Complete!',
        `Challenge results are in! ${winner === userId ? 'You lost' : 'You won'}!`,
        { challenge_id: challengeId },
      );
    } else {
      await this.notificationService.sendNotification(
        otherUserId,
        'CHALLENGE',
        'Your turn!',
        `Your friend has played their challenge round. Now it's your turn!`,
        { challenge_id: challengeId, game_type: challenge.game_type },
      );
    }

    return { success: true, both_played: otherScoreExists };
  }

  // ─── GET CHALLENGES ────────────────────────────────────────────

  async getMyChallenges(userId: string, status?: string) {
    const where: any = {
      OR: [{ challenger_id: userId }, { opponent_id: userId }],
    };
    if (status) where.status = status;

    return this.prisma.challenge.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async getChallengeResult(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');

    return {
      ...challenge,
      winner_id: challenge.status === 'COMPLETED'
        ? (challenge.challenger_score! > challenge.opponent_score! ? challenge.challenger_id : challenge.opponent_id)
        : null,
    };
  }
}
