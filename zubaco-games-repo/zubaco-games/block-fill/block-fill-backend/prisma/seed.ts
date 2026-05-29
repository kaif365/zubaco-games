import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import * as path from 'path';

import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

import { PrismaClient, type Prisma } from '../generated/prisma/client';
import { GAME_TYPES } from '../src/common/constants';
import {
    extractPairsFromBoardShape,
    toStoredBoardShape,
} from '../src/common/utils/block-fill-board.util';
import { hasBlockFillSolution } from '../src/game/utils/block-fill-solver';
import { validateBlockFillPairs } from '../src/game/utils/block-fill-validator';

dotenv.config({
    path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`),
});
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function resolveIPv4(hostname: string): Promise<string> {
    if (hostname === 'localhost' || isIP(hostname) !== 0) {
        return Promise.resolve(hostname);
    }

    return new Promise((resolve, reject) => {
        lookup(hostname, { family: 4 }, (err, address) => {
            if (err) {
                reject(err);
            } else {
                resolve(address);
            }
        });
    });
}

type Point = { row: number; col: number };

type Path = Point[];

type BoardSeed = {
    name: string;
    gridRow: number;
    gridCol: number;
    nodes: {
        colorCode: string;
        points: [Point, Point];
    }[];
    timeLimit: number;
};

const COLORS = ['blue', 'red', 'green', 'amber', 'purple', 'cyan'];

const LEVEL_CONFIG = [
    { name: 'Demo', size: 5, pairs: 3, count: 0, difficultyScore: 0 },
    { name: 'Easy', size: 5, pairs: 3, count: 3, difficultyScore: 1 },
    { name: 'Medium', size: 6, pairs: 4, count: 3, difficultyScore: 2 },
    { name: 'Hard', size: 7, pairs: 5, count: 2, difficultyScore: 3 },
];

function shuffle<T>(arr: T[]): T[] {
    return arr.sort(() => Math.random() - 0.5);
}

function generateFullPaths(grid: number, pairCount: number): Path[] {
    const cells: Point[] = [];

    for (let r = 0; r < grid; r++) {
        if (r % 2 === 0) {
            for (let c = 0; c < grid; c++) {
                cells.push({ row: r, col: c });
            }
        } else {
            for (let c = grid - 1; c >= 0; c--) {
                cells.push({ row: r, col: c });
            }
        }
    }

    const segmentSize = Math.floor(cells.length / pairCount);
    const paths: Path[] = [];

    let index = 0;
    for (let i = 0; i < pairCount; i++) {
        const size = i === pairCount - 1 ? cells.length - index : segmentSize;
        paths.push(cells.slice(index, index + size));
        index += size;
    }

    return paths;
}

function buildBoardFromPaths(grid: number, paths: Path[]): BoardSeed {
    const nodes = paths.map((path, i) => ({
        colorCode: COLORS[i % COLORS.length],
        points: [path[0], path[path.length - 1]] as [Point, Point],
    }));

    return {
        name: `Generated ${grid}x${grid} Board`,
        gridRow: grid,
        gridCol: grid,
        nodes,
        timeLimit: 120,
    };
}

function generateSolvableBoard(grid: number, pairCount: number): BoardSeed {
    const MAX_ATTEMPTS = 200;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
            const paths = generateFullPaths(grid, pairCount);
            const shuffled = shuffle(paths);

            const boardSeed = buildBoardFromPaths(grid, shuffled);

            const shape = toStoredBoardShape(boardSeed);
            const pairs = extractPairsFromBoardShape(shape);

            validateBlockFillPairs(grid, grid, pairs);

            const solvable = hasBlockFillSolution({
                gridX: grid,
                gridY: grid,
                pairs,
            });

            if (solvable) {
                return boardSeed;
            }
        } catch {
            continue;
        }
    }

    throw new Error('Failed to generate solvable board');
}

function assertSeedBoardIsPersistable(boardSeed: BoardSeed): ReturnType<typeof toStoredBoardShape> {
    const storedShape = toStoredBoardShape(boardSeed);
    const pairs = extractPairsFromBoardShape(storedShape);

    validateBlockFillPairs(boardSeed.gridCol, boardSeed.gridRow, pairs);

    const solvable = hasBlockFillSolution({
        gridX: boardSeed.gridCol,
        gridY: boardSeed.gridRow,
        pairs,
    });

    if (!solvable) {
        throw new Error(
            `Generated seed board is not solvable after storage normalization: ${storedShape.name}`,
        );
    }

    return storedShape;
}

async function main() {
    console.log('Seeding database with guaranteed solvable boards...');

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

    const prisma = new PrismaClient({
        adapter: new PrismaPg(pool),
    });

    let firstLevelId: string | null = null;

    for (const levelConfig of LEVEL_CONFIG) {
        let level = await prisma.level.findFirst({
            where: { name: levelConfig.name, deletedAt: null },
        });

        if (!level) {
            level = await prisma.level.create({
                data: { name: levelConfig.name, difficultyScore: levelConfig.difficultyScore },
            });
            console.log(`+ Level "${levelConfig.name}" created`);
        } else {
            if (level.difficultyScore !== levelConfig.difficultyScore) {
                level = await prisma.level.update({
                    where: { id: level.id },
                    data: { difficultyScore: levelConfig.difficultyScore },
                });
                console.log(`~ Level "${levelConfig.name}" difficultyScore updated`);
            } else {
                console.log(`~ Level "${levelConfig.name}" exists`);
            }
        }

        if (!firstLevelId) {
            firstLevelId = level.id;
        }

        for (let i = 0; i < levelConfig.count; i++) {
            const boardSeed = generateSolvableBoard(levelConfig.size, levelConfig.pairs);

            const shape = assertSeedBoardIsPersistable({
                ...boardSeed,
                name: `${levelConfig.name} Board ${i + 1}`,
                nodes: boardSeed.nodes.map((node) => ({
                    colorCode: node.colorCode,
                    points: [...node.points] as [Point, Point],
                })),
            });

            await prisma.board.create({
                data: {
                    levelId: level.id,
                    name: `${levelConfig.name} Board ${i + 1}`,
                    gameType: GAME_TYPES.BLOCK_FILL,
                    gridX: levelConfig.size,
                    gridY: levelConfig.size,
                    timeLimit: boardSeed.timeLimit,
                    pairs: shape as unknown as Prisma.InputJsonValue,
                },
            });

            console.log(`  + Board ${i + 1} created`);
        }
    }

    const existingConfig = await prisma.gameConfig.findFirst();

    if (!existingConfig) {
        await prisma.gameConfig.create({
            data: { activeLevelId: firstLevelId },
        });
        console.log('+ GameConfig created');
    }

    console.log('Seeding completed successfully');

    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
});
