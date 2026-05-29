import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Resolve ipv4.
 *
 * @param {string} hostname - hostname value.
 *
 * @returns {Promise<string>} The string result.
 */
function resolveIPv4(hostname: string): Promise<string> {
    if (hostname === 'localhost' || isIP(hostname) !== 0) {
        return Promise.resolve(hostname);
    }

    return new Promise((resolve, reject) => {
        lookup(hostname, { family: 4 }, (err, address) => {
            if (err) reject(err);
            else resolve(address);
        });
    });
}

// Load environment variables
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Direction map: Unity enum → integer stored in DB (0=up 1=down 2=left 3=right)
const D = { up: 0, down: 1, left: 2, right: 3 } as const;
type Dir = keyof typeof D;

interface ArrowSeed {
    waypoints: { x: number; y: number }[];
    headDirection: Dir;
    color: number;
    sortOrder: number;
}

interface BoardSeed {
    name: string;
    gridX: number;
    gridY: number;
    arrows: Omit<ArrowSeed, 'sortOrder'>[];
}

interface LevelSeed {
    name: string;
    isDemo?: boolean;
    difficultyScore?: number;
    boards: BoardSeed[];
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const LEVELS: LevelSeed[] = [
    {
        name: 'Easy',
        difficultyScore: 1,
        boards: [
            {
                name: 'Board 1',
                gridX: 4,
                gridY: 4,
                arrows: [
                    {
                        waypoints: [
                            { x: 0, y: 0 },
                            { x: 0, y: 1 },
                            { x: 0, y: 2 },
                            { x: 0, y: 3 },
                        ],
                        headDirection: 'up',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 1, y: 3 },
                            { x: 1, y: 2 },
                            { x: 1, y: 1 },
                            { x: 1, y: 0 },
                        ],
                        headDirection: 'down',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 3, y: 0 },
                            { x: 3, y: 1 },
                            { x: 2, y: 1 },
                            { x: 2, y: 0 },
                        ],
                        headDirection: 'down',
                        color: 0xffcc33,
                    },
                    {
                        waypoints: [
                            { x: 2, y: 2 },
                            { x: 3, y: 2 },
                            { x: 3, y: 3 },
                            { x: 2, y: 3 },
                        ],
                        headDirection: 'left',
                        color: 0xffaa22,
                    },
                ],
            },
            {
                name: 'Board 2',
                gridX: 6,
                gridY: 6,
                arrows: [
                    {
                        waypoints: [
                            { x: 1, y: 0 },
                            { x: 1, y: 1 },
                            { x: 0, y: 1 },
                            { x: 0, y: 2 },
                            { x: 0, y: 3 },
                            { x: 0, y: 4 },
                            { x: 1, y: 4 },
                            { x: 1, y: 5 },
                        ],
                        headDirection: 'up',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 4, y: 5 },
                            { x: 4, y: 4 },
                            { x: 5, y: 4 },
                            { x: 5, y: 3 },
                            { x: 5, y: 2 },
                            { x: 5, y: 1 },
                            { x: 4, y: 1 },
                            { x: 4, y: 0 },
                        ],
                        headDirection: 'down',
                        color: 0xff6666,
                    },
                    {
                        waypoints: [
                            { x: 1, y: 3 },
                            { x: 2, y: 3 },
                            { x: 3, y: 3 },
                            { x: 4, y: 3 },
                        ],
                        headDirection: 'right',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 4, y: 2 },
                            { x: 3, y: 2 },
                            { x: 2, y: 2 },
                            { x: 1, y: 2 },
                        ],
                        headDirection: 'left',
                        color: 0xffcc33,
                    },
                    {
                        waypoints: [
                            { x: 2, y: 0 },
                            { x: 2, y: 1 },
                            { x: 3, y: 1 },
                            { x: 3, y: 0 },
                        ],
                        headDirection: 'down',
                        color: 0xcc66ff,
                    },
                    {
                        waypoints: [
                            { x: 3, y: 5 },
                            { x: 3, y: 4 },
                            { x: 2, y: 4 },
                            { x: 2, y: 5 },
                        ],
                        headDirection: 'up',
                        color: 0xff9933,
                    },
                ],
            },
        ],
    },
    {
        name: 'Medium',
        difficultyScore: 2,
        boards: [
            {
                name: 'Board 1',
                gridX: 8,
                gridY: 8,
                arrows: [
                    {
                        waypoints: [
                            { x: 0, y: 7 },
                            { x: 0, y: 6 },
                            { x: 0, y: 5 },
                            { x: 0, y: 4 },
                            { x: 0, y: 3 },
                            { x: 1, y: 3 },
                            { x: 1, y: 4 },
                            { x: 1, y: 5 },
                            { x: 1, y: 6 },
                            { x: 1, y: 7 },
                        ],
                        headDirection: 'up',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 4, y: 7 },
                            { x: 3, y: 7 },
                            { x: 2, y: 7 },
                        ],
                        headDirection: 'left',
                        color: 0xff6666,
                    },
                    {
                        waypoints: [
                            { x: 4, y: 6 },
                            { x: 3, y: 6 },
                            { x: 2, y: 6 },
                        ],
                        headDirection: 'left',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 3, y: 4 },
                            { x: 2, y: 4 },
                            { x: 2, y: 3 },
                            { x: 3, y: 3 },
                            { x: 4, y: 3 },
                            { x: 4, y: 4 },
                            { x: 4, y: 5 },
                            { x: 3, y: 5 },
                            { x: 2, y: 5 },
                        ],
                        headDirection: 'left',
                        color: 0xffcc33,
                    },
                    {
                        waypoints: [
                            { x: 2, y: 2 },
                            { x: 2, y: 1 },
                            { x: 2, y: 0 },
                            { x: 3, y: 0 },
                            { x: 4, y: 0 },
                            { x: 4, y: 1 },
                            { x: 3, y: 1 },
                            { x: 3, y: 2 },
                        ],
                        headDirection: 'up',
                        color: 0xcc66ff,
                    },
                    {
                        waypoints: [
                            { x: 7, y: 2 },
                            { x: 6, y: 2 },
                            { x: 5, y: 2 },
                            { x: 4, y: 2 },
                        ],
                        headDirection: 'left',
                        color: 0xff9933,
                    },
                    {
                        waypoints: [
                            { x: 5, y: 1 },
                            { x: 5, y: 0 },
                            { x: 6, y: 0 },
                            { x: 6, y: 1 },
                        ],
                        headDirection: 'up',
                        color: 0x33e5e5,
                    },
                    {
                        waypoints: [
                            { x: 5, y: 7 },
                            { x: 5, y: 6 },
                            { x: 6, y: 6 },
                            { x: 7, y: 6 },
                        ],
                        headDirection: 'right',
                        color: 0xff80cc,
                    },
                    {
                        waypoints: [
                            { x: 6, y: 4 },
                            { x: 7, y: 4 },
                            { x: 7, y: 3 },
                            { x: 6, y: 3 },
                            { x: 5, y: 3 },
                            { x: 5, y: 4 },
                            { x: 5, y: 5 },
                            { x: 6, y: 5 },
                            { x: 7, y: 5 },
                        ],
                        headDirection: 'right',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 1, y: 0 },
                            { x: 1, y: 1 },
                            { x: 1, y: 2 },
                            { x: 0, y: 2 },
                            { x: 0, y: 1 },
                            { x: 0, y: 0 },
                        ],
                        headDirection: 'down',
                        color: 0xff6666,
                    },
                    {
                        waypoints: [
                            { x: 6, y: 7 },
                            { x: 7, y: 7 },
                        ],
                        headDirection: 'right',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 7, y: 0 },
                            { x: 7, y: 1 },
                        ],
                        headDirection: 'up',
                        color: 0xffcc33,
                    },
                ],
            },
        ],
    },
    {
        name: 'Hard',
        difficultyScore: 3,
        boards: [
            {
                name: 'Board 1',
                gridX: 12,
                gridY: 12,
                arrows: [
                    {
                        waypoints: [
                            { x: 5, y: 11 },
                            { x: 5, y: 10 },
                            { x: 4, y: 10 },
                            { x: 4, y: 11 },
                            { x: 3, y: 11 },
                            { x: 3, y: 10 },
                            { x: 2, y: 10 },
                            { x: 2, y: 9 },
                            { x: 1, y: 9 },
                            { x: 1, y: 8 },
                            { x: 0, y: 8 },
                            { x: 0, y: 7 },
                            { x: 0, y: 6 },
                            { x: 0, y: 5 },
                            { x: 0, y: 4 },
                            { x: 0, y: 3 },
                            { x: 1, y: 3 },
                            { x: 1, y: 2 },
                            { x: 2, y: 2 },
                            { x: 2, y: 1 },
                            { x: 3, y: 1 },
                            { x: 3, y: 0 },
                            { x: 4, y: 0 },
                            { x: 5, y: 0 },
                            { x: 6, y: 0 },
                            { x: 7, y: 0 },
                            { x: 8, y: 0 },
                            { x: 8, y: 1 },
                            { x: 9, y: 1 },
                            { x: 9, y: 2 },
                            { x: 10, y: 2 },
                            { x: 10, y: 3 },
                            { x: 11, y: 3 },
                            { x: 11, y: 4 },
                            { x: 11, y: 5 },
                            { x: 11, y: 6 },
                            { x: 11, y: 7 },
                            { x: 11, y: 8 },
                            { x: 10, y: 8 },
                            { x: 10, y: 9 },
                            { x: 9, y: 9 },
                            { x: 9, y: 10 },
                            { x: 8, y: 10 },
                            { x: 8, y: 11 },
                            { x: 7, y: 11 },
                            { x: 7, y: 10 },
                            { x: 6, y: 10 },
                            { x: 6, y: 11 },
                        ],
                        headDirection: 'up',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 10, y: 7 },
                            { x: 9, y: 7 },
                        ],
                        headDirection: 'left',
                        color: 0xff6666,
                    },
                    {
                        waypoints: [
                            { x: 1, y: 6 },
                            { x: 2, y: 6 },
                        ],
                        headDirection: 'right',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 10, y: 5 },
                            { x: 9, y: 5 },
                        ],
                        headDirection: 'left',
                        color: 0xffcc33,
                    },
                    {
                        waypoints: [
                            { x: 1, y: 4 },
                            { x: 2, y: 4 },
                        ],
                        headDirection: 'right',
                        color: 0xcc66ff,
                    },
                    {
                        waypoints: [
                            { x: 9, y: 8 },
                            { x: 8, y: 8 },
                            { x: 8, y: 9 },
                        ],
                        headDirection: 'up',
                        color: 0xff9933,
                    },
                    {
                        waypoints: [
                            { x: 2, y: 3 },
                            { x: 3, y: 3 },
                            { x: 3, y: 2 },
                        ],
                        headDirection: 'down',
                        color: 0x33e5e5,
                    },
                    {
                        waypoints: [
                            { x: 1, y: 5 },
                            { x: 2, y: 5 },
                            { x: 3, y: 5 },
                            { x: 3, y: 6 },
                            { x: 3, y: 7 },
                            { x: 2, y: 7 },
                            { x: 1, y: 7 },
                        ],
                        headDirection: 'left',
                        color: 0xff80cc,
                    },
                    {
                        waypoints: [
                            { x: 10, y: 6 },
                            { x: 9, y: 6 },
                            { x: 8, y: 6 },
                            { x: 8, y: 5 },
                            { x: 8, y: 4 },
                            { x: 9, y: 4 },
                            { x: 10, y: 4 },
                        ],
                        headDirection: 'right',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 9, y: 3 },
                            { x: 8, y: 3 },
                            { x: 8, y: 2 },
                            { x: 7, y: 2 },
                            { x: 7, y: 1 },
                            { x: 6, y: 1 },
                        ],
                        headDirection: 'left',
                        color: 0xff6666,
                    },
                    {
                        waypoints: [
                            { x: 4, y: 2 },
                            { x: 4, y: 1 },
                            { x: 5, y: 1 },
                            { x: 5, y: 2 },
                            { x: 6, y: 2 },
                            { x: 6, y: 3 },
                            { x: 7, y: 3 },
                            { x: 7, y: 4 },
                        ],
                        headDirection: 'up',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 3, y: 4 },
                            { x: 4, y: 4 },
                            { x: 5, y: 4 },
                            { x: 6, y: 4 },
                        ],
                        headDirection: 'right',
                        color: 0xffcc33,
                    },
                    {
                        waypoints: [
                            { x: 4, y: 3 },
                            { x: 5, y: 3 },
                        ],
                        headDirection: 'right',
                        color: 0xcc66ff,
                    },
                    {
                        waypoints: [
                            { x: 8, y: 7 },
                            { x: 7, y: 7 },
                            { x: 7, y: 8 },
                            { x: 7, y: 9 },
                            { x: 6, y: 9 },
                            { x: 6, y: 8 },
                            { x: 6, y: 7 },
                            { x: 6, y: 6 },
                            { x: 7, y: 6 },
                            { x: 7, y: 5 },
                            { x: 6, y: 5 },
                        ],
                        headDirection: 'left',
                        color: 0xff9933,
                    },
                    {
                        waypoints: [
                            { x: 5, y: 6 },
                            { x: 5, y: 7 },
                            { x: 5, y: 8 },
                            { x: 4, y: 8 },
                        ],
                        headDirection: 'left',
                        color: 0x33e5e5,
                    },
                    {
                        waypoints: [
                            { x: 4, y: 6 },
                            { x: 4, y: 7 },
                        ],
                        headDirection: 'up',
                        color: 0xff80cc,
                    },
                    {
                        waypoints: [
                            { x: 2, y: 8 },
                            { x: 3, y: 8 },
                            { x: 3, y: 9 },
                            { x: 4, y: 9 },
                            { x: 5, y: 9 },
                        ],
                        headDirection: 'right',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 5, y: 5 },
                            { x: 4, y: 5 },
                        ],
                        headDirection: 'left',
                        color: 0xff6666,
                    },
                ],
            },
            {
                name: 'Board 2',
                gridX: 14,
                gridY: 14,
                arrows: [
                    {
                        waypoints: [
                            { x: 13, y: 13 },
                            { x: 13, y: 12 },
                            { x: 12, y: 12 },
                            { x: 12, y: 11 },
                            { x: 11, y: 11 },
                            { x: 11, y: 10 },
                            { x: 10, y: 10 },
                            { x: 10, y: 9 },
                            { x: 9, y: 9 },
                            { x: 9, y: 8 },
                            { x: 8, y: 8 },
                            { x: 8, y: 7 },
                            { x: 7, y: 7 },
                            { x: 7, y: 6 },
                            { x: 6, y: 6 },
                            { x: 6, y: 5 },
                            { x: 5, y: 5 },
                            { x: 5, y: 4 },
                            { x: 4, y: 4 },
                            { x: 4, y: 3 },
                            { x: 3, y: 3 },
                            { x: 3, y: 2 },
                            { x: 2, y: 2 },
                            { x: 2, y: 1 },
                            { x: 1, y: 1 },
                            { x: 1, y: 0 },
                            { x: 0, y: 0 },
                        ],
                        headDirection: 'left',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 0, y: 13 },
                            { x: 1, y: 13 },
                            { x: 1, y: 12 },
                            { x: 2, y: 12 },
                            { x: 2, y: 11 },
                            { x: 3, y: 11 },
                            { x: 3, y: 10 },
                            { x: 4, y: 10 },
                            { x: 4, y: 9 },
                            { x: 5, y: 9 },
                            { x: 5, y: 8 },
                            { x: 6, y: 8 },
                            { x: 6, y: 9 },
                            { x: 6, y: 10 },
                        ],
                        headDirection: 'up',
                        color: 0xff6666,
                    },
                    {
                        waypoints: [
                            { x: 13, y: 0 },
                            { x: 12, y: 0 },
                            { x: 12, y: 1 },
                            { x: 11, y: 1 },
                            { x: 11, y: 2 },
                            { x: 10, y: 2 },
                            { x: 10, y: 3 },
                            { x: 9, y: 3 },
                            { x: 9, y: 4 },
                            { x: 8, y: 4 },
                            { x: 8, y: 5 },
                            { x: 7, y: 5 },
                        ],
                        headDirection: 'left',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 5, y: 6 },
                            { x: 4, y: 6 },
                            { x: 3, y: 6 },
                            { x: 2, y: 6 },
                            { x: 2, y: 5 },
                            { x: 1, y: 5 },
                        ],
                        headDirection: 'left',
                        color: 0xffcc33,
                    },
                    {
                        waypoints: [
                            { x: 6, y: 7 },
                            { x: 5, y: 7 },
                            { x: 4, y: 7 },
                            { x: 3, y: 7 },
                            { x: 2, y: 7 },
                        ],
                        headDirection: 'left',
                        color: 0xcc66ff,
                    },
                    {
                        waypoints: [
                            { x: 0, y: 1 },
                            { x: 0, y: 2 },
                            { x: 0, y: 3 },
                            { x: 0, y: 4 },
                            { x: 0, y: 5 },
                            { x: 0, y: 6 },
                            { x: 1, y: 6 },
                            { x: 1, y: 7 },
                            { x: 0, y: 7 },
                            { x: 0, y: 8 },
                            { x: 0, y: 9 },
                            { x: 0, y: 10 },
                            { x: 0, y: 11 },
                            { x: 0, y: 12 },
                        ],
                        headDirection: 'up',
                        color: 0xff9933,
                    },
                    {
                        waypoints: [
                            { x: 4, y: 5 },
                            { x: 3, y: 5 },
                            { x: 3, y: 4 },
                        ],
                        headDirection: 'down',
                        color: 0x33e5e5,
                    },
                    {
                        waypoints: [
                            { x: 1, y: 2 },
                            { x: 1, y: 3 },
                            { x: 1, y: 4 },
                        ],
                        headDirection: 'up',
                        color: 0xff80cc,
                    },
                    {
                        waypoints: [
                            { x: 2, y: 4 },
                            { x: 2, y: 3 },
                        ],
                        headDirection: 'down',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 2, y: 0 },
                            { x: 3, y: 0 },
                            { x: 3, y: 1 },
                            { x: 4, y: 1 },
                            { x: 4, y: 0 },
                            { x: 5, y: 0 },
                            { x: 5, y: 1 },
                            { x: 5, y: 2 },
                            { x: 4, y: 2 },
                        ],
                        headDirection: 'left',
                        color: 0xff6666,
                    },
                    {
                        waypoints: [
                            { x: 5, y: 3 },
                            { x: 6, y: 3 },
                            { x: 6, y: 2 },
                            { x: 7, y: 2 },
                            { x: 7, y: 3 },
                            { x: 7, y: 4 },
                            { x: 6, y: 4 },
                        ],
                        headDirection: 'left',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 6, y: 1 },
                            { x: 6, y: 0 },
                            { x: 7, y: 0 },
                            { x: 7, y: 1 },
                        ],
                        headDirection: 'up',
                        color: 0xffcc33,
                    },
                    {
                        waypoints: [
                            { x: 8, y: 3 },
                            { x: 8, y: 2 },
                            { x: 8, y: 1 },
                            { x: 8, y: 0 },
                            { x: 9, y: 0 },
                            { x: 10, y: 0 },
                            { x: 11, y: 0 },
                        ],
                        headDirection: 'right',
                        color: 0xcc66ff,
                    },
                    {
                        waypoints: [
                            { x: 10, y: 1 },
                            { x: 9, y: 1 },
                            { x: 9, y: 2 },
                        ],
                        headDirection: 'up',
                        color: 0xff9933,
                    },
                    {
                        waypoints: [
                            { x: 13, y: 11 },
                            { x: 13, y: 10 },
                            { x: 12, y: 10 },
                            { x: 12, y: 9 },
                            { x: 11, y: 9 },
                            { x: 11, y: 8 },
                            { x: 10, y: 8 },
                            { x: 10, y: 7 },
                            { x: 9, y: 7 },
                            { x: 9, y: 6 },
                            { x: 8, y: 6 },
                        ],
                        headDirection: 'left',
                        color: 0x33e5e5,
                    },
                    {
                        waypoints: [
                            { x: 9, y: 5 },
                            { x: 10, y: 5 },
                            { x: 10, y: 6 },
                            { x: 11, y: 6 },
                            { x: 11, y: 7 },
                            { x: 12, y: 7 },
                            { x: 12, y: 8 },
                            { x: 13, y: 8 },
                            { x: 13, y: 9 },
                        ],
                        headDirection: 'up',
                        color: 0xff80cc,
                    },
                    {
                        waypoints: [
                            { x: 13, y: 1 },
                            { x: 13, y: 2 },
                            { x: 12, y: 2 },
                        ],
                        headDirection: 'left',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 12, y: 4 },
                            { x: 12, y: 5 },
                            { x: 12, y: 6 },
                            { x: 13, y: 6 },
                            { x: 13, y: 7 },
                        ],
                        headDirection: 'up',
                        color: 0xff6666,
                    },
                    {
                        waypoints: [
                            { x: 11, y: 5 },
                            { x: 11, y: 4 },
                            { x: 10, y: 4 },
                        ],
                        headDirection: 'left',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 11, y: 3 },
                            { x: 12, y: 3 },
                            { x: 13, y: 3 },
                            { x: 13, y: 4 },
                            { x: 13, y: 5 },
                        ],
                        headDirection: 'up',
                        color: 0xffcc33,
                    },
                    {
                        waypoints: [
                            { x: 7, y: 12 },
                            { x: 7, y: 13 },
                            { x: 6, y: 13 },
                            { x: 6, y: 12 },
                            { x: 6, y: 11 },
                            { x: 7, y: 11 },
                            { x: 8, y: 11 },
                            { x: 8, y: 12 },
                            { x: 8, y: 13 },
                            { x: 9, y: 13 },
                            { x: 10, y: 13 },
                        ],
                        headDirection: 'right',
                        color: 0xcc66ff,
                    },
                    {
                        waypoints: [
                            { x: 7, y: 8 },
                            { x: 7, y: 9 },
                            { x: 7, y: 10 },
                        ],
                        headDirection: 'up',
                        color: 0xff9933,
                    },
                    {
                        waypoints: [
                            { x: 1, y: 8 },
                            { x: 1, y: 9 },
                            { x: 1, y: 10 },
                            { x: 1, y: 11 },
                        ],
                        headDirection: 'up',
                        color: 0x3399ff,
                    },
                    {
                        waypoints: [
                            { x: 2, y: 8 },
                            { x: 2, y: 9 },
                            { x: 2, y: 10 },
                        ],
                        headDirection: 'up',
                        color: 0xff6666,
                    },
                    {
                        waypoints: [
                            { x: 3, y: 9 },
                            { x: 3, y: 8 },
                            { x: 4, y: 8 },
                        ],
                        headDirection: 'right',
                        color: 0x66e666,
                    },
                    {
                        waypoints: [
                            { x: 5, y: 13 },
                            { x: 4, y: 13 },
                            { x: 3, y: 13 },
                            { x: 2, y: 13 },
                        ],
                        headDirection: 'left',
                        color: 0xff9933,
                    },
                    {
                        waypoints: [
                            { x: 10, y: 11 },
                            { x: 10, y: 12 },
                        ],
                        headDirection: 'up',
                        color: 0x33e5e5,
                    },
                    {
                        waypoints: [
                            { x: 11, y: 12 },
                            { x: 11, y: 13 },
                            { x: 12, y: 13 },
                        ],
                        headDirection: 'right',
                        color: 0x33e5e5,
                    },
                    {
                        waypoints: [
                            { x: 8, y: 9 },
                            { x: 8, y: 10 },
                            { x: 9, y: 10 },
                            { x: 9, y: 11 },
                            { x: 9, y: 12 },
                        ],
                        headDirection: 'up',
                        color: 0x33e5e5,
                    },
                    {
                        waypoints: [
                            { x: 4, y: 11 },
                            { x: 4, y: 12 },
                            { x: 3, y: 12 },
                        ],
                        headDirection: 'left',
                        color: 0xff9933,
                    },
                    {
                        waypoints: [
                            { x: 5, y: 10 },
                            { x: 5, y: 11 },
                            { x: 5, y: 12 },
                        ],
                        headDirection: 'up',
                        color: 0x33e5e5,
                    },
                ],
            },
        ],
    },
    {
        name: 'Demo',
        isDemo: true,
        difficultyScore: 0,
        boards: [],
    },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Run the seed script.
 *
 * @returns {Promise<void>} Resolves when the operation completes.
 */
async function main() {
    console.log('Seeding Arrows database...');

    const dbUrl = new URL(process.env.DATABASE_URL!);
    const host = await resolveIPv4(dbUrl.hostname).catch(() => dbUrl.hostname);
    const pool = new Pool({
        host,
        port: Number(dbUrl.port) || 5432,
        database: decodeURIComponent(dbUrl.pathname.slice(1)),
        user: decodeURIComponent(dbUrl.username),
        password: decodeURIComponent(dbUrl.password),
        ssl: { rejectUnauthorized: false, servername: dbUrl.hostname },
        connectionTimeoutMillis: 20000,
    });

    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    let firstLevelId: string | null = null;

    for (const levelSeed of LEVELS) {
        let level = await prisma.level.findFirst({
            where: { name: levelSeed.name, deletedAt: null },
        });
        const seedIsDemo = levelSeed.isDemo ?? false;
        const seedDifficultyScore = levelSeed.difficultyScore ?? 0;

        if (!level) {
            level = await prisma.level.create({
                data: { name: levelSeed.name, isDemo: seedIsDemo, difficultyScore: seedDifficultyScore },
            });
            console.log(`  + Level "${levelSeed.name}" created`);
        } else {
            const needsUpdate =
                level.isDemo !== seedIsDemo || level.difficultyScore !== seedDifficultyScore;
            if (needsUpdate) {
                level = await prisma.level.update({
                    where: { id: level.id },
                    data: { isDemo: seedIsDemo, difficultyScore: seedDifficultyScore },
                });
                console.log(
                    `  ~ Level "${levelSeed.name}" updated isDemo=${level.isDemo} difficultyScore=${level.difficultyScore}`,
                );
            } else {
                console.log(`  ~ Level "${levelSeed.name}" already exists, skipping`);
            }
        }

        if (firstLevelId === null) firstLevelId = level.id;

        for (const boardSeed of levelSeed.boards) {
            let board = await prisma.board.findFirst({
                where: { levelId: level.id, name: boardSeed.name, deletedAt: null },
            });
            if (board) {
                console.log(`    ~ Board "${boardSeed.name}" already exists, skipping`);
                continue;
            }

            board = await prisma.board.create({
                data: {
                    levelId: level.id,
                    name: boardSeed.name,
                    gridX: boardSeed.gridX,
                    gridY: boardSeed.gridY,
                },
            });

            for (let i = 0; i < boardSeed.arrows.length; i++) {
                const a = boardSeed.arrows[i];
                await prisma.arrow.create({
                    data: {
                        boardId: board.id,
                        color: a.color,
                        headDirection: D[a.headDirection],
                        waypoints: a.waypoints,
                        sortOrder: i,
                    },
                });
            }
            console.log(
                `    + Board "${boardSeed.name}" created with ${boardSeed.arrows.length} arrows`,
            );
        }
    }

    console.log('Database seeded successfully!');
    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
});
