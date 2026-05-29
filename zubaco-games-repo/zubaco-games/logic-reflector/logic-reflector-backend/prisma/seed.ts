/**
 * Seed — mirrors the 5 frontend levels exactly (levels.ts → lr-001 … lr-005).
 *
 * Enum values used throughout (no strings):
 *   CELL_TYPE  : 1=emitter  2=target  3=blocker
 *   BLOCK_TYPE : 1=reflect-block  2=mirror-fwd  3=mirror-bwd  4=splitter  5=blocker
 *
 * Level grouping → stage rounds:
 *   Easy   (boardCount 2) : lr-001  lr-002
 *   Medium (boardCount 2) : lr-003  lr-004
 *   Hard   (boardCount 1) : lr-005
 *   Demo   (boardCount 1) : tutorial board
 *   Total rounds per session = 5
 *
 * Frontend level → backend mapping
 * ─────────────────────────────────────────────────────────────────
 *  lr-001  5×5  emitter(3,0,'NE')  target(0,0)
 *          moveable reflect-block at (3,3)
 *          solution: move block → (1,2)
 *
 *  lr-002  5×5  emitter(4,0,'NE')  target(0,1)
 *          moveable reflect-block at (0,3) and (3,1)
 *          solution: move blocks → (2,2) and (1,0)
 *
 *  lr-003  5×5  emitter(3,0,'NE')  target(2,1)  target(0,0)
 *          moveable reflect-block at (4,3)
 *          solution: move block → (1,2)
 *
 *  lr-004  6×6  emitter(5,0,'NE')  target(0,1)
 *          fixed reflect-block at (2,3)
 *          moveable reflect-block at (4,4)
 *          solution: move block → (0,0)
 *
 *  lr-005  7×7  emitter(6,0,'NE')  target(1,3)  target(0,4)
 *          moveable reflect-block at (0,0) and (5,5)
 *          solution: move blocks → (3,3) and (2,1)
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const dbUrl = new URL(process.env.DATABASE_URL!);
const sslMode = dbUrl.searchParams.get("sslmode");
const isSslDisabled = sslMode === "disable" || sslMode === "false";

const pool = new Pool({
    host: dbUrl.hostname,
    port: Number(dbUrl.port) || 5432,
    database: decodeURIComponent(dbUrl.pathname.slice(1)),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    ssl: isSslDisabled ? false : { rejectUnauthorized: false, servername: dbUrl.hostname }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// ── Enums (match constants.ts exactly) ───────────────────────────────────────

const CELL_TYPE = {
    EMITTER:       1,
    TARGET:        2,
    BLOCKER:       3,
    REFLECT_BLOCK: 4,
    MIRROR_FWD:    5,
    MIRROR_BWD:    6,
    SPLITTER:      7,
} as const;

const BLOCK_TYPE = {
    REFLECT_BLOCK: 1,
    MIRROR_FWD:    2,
    MIRROR_BWD:    3,
    SPLITTER:      4,
    BLOCKER:       5,
} as const;

const STAGE_ID = '00000000-0000-0000-0000-000000000001';

// ── Cell / block builders ─────────────────────────────────────────────────────

const emitter = (boardId: string, row: number, col: number, direction: string, x: number, y: number, order: number) => ({
    boardId, row, col,
    cellType:    CELL_TYPE.EMITTER,
    direction,
    orientation: 0,
    x,
    y,
    sortOrder:   order,
});

const target = (boardId: string, row: number, col: number, x: number, y: number, order: number) => ({
    boardId, row, col,
    cellType:    CELL_TYPE.TARGET,
    direction:   null,
    orientation: 0,
    x,
    y,
    sortOrder:   order,
});

const moveableBlock = (boardId: string, row: number, col: number, blockType: number, order: number) => ({
    boardId, row, col, blockType,
    orientation: 0,
    isFixed:     false,
    sortOrder:   order,
});

const fixedBlock = (boardId: string, row: number, col: number, blockType: number, order: number) => ({
    boardId, row, col, blockType,
    orientation: 0,
    isFixed:     true,
    sortOrder:   order,
});

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Clearing database…');
    await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE
            game_sessions,
            stage_demo_level_configs,
            stage_level_configs,
            stage_configs,
            board_available_blocks,
            board_blocks,
            board_cells,
            boards,
            levels
        CASCADE
    `);

    console.log('Seeding…\n');

    // ── EASY — lr-001 + lr-002 ────────────────────────────────────────────────

    const easyLevel = await prisma.level.create({ data: { name: 'Easy', isDemo: false } });

    // lr-001 : emitter(3,0,'NE')  target(0,0)  moveable reflect-block(3,3)
    const b1 = await prisma.board.create({
        data: { levelId: easyLevel.id, name: 'lr-001', gridX: 5, gridY: 5 },
    });
    await prisma.boardCell.createMany({
        data: [
            emitter(b1.id, 3, 0, 'NE', 0.5, 3.08, 1),
            target(b1.id, 0, 0, 0.9, 0.32, 2),
        ],
    });
    await prisma.boardBlock.create({ data: moveableBlock(b1.id, 3, 3, BLOCK_TYPE.REFLECT_BLOCK, 1) });

    // lr-002 : emitter(4,0,'NE')  target(0,1)  moveable reflect-block(0,3) + (3,1)
    const b2 = await prisma.board.create({
        data: { levelId: easyLevel.id, name: 'lr-002', gridX: 5, gridY: 5 },
    });
    await prisma.boardCell.createMany({
        data: [
            emitter(b2.id, 4, 0, 'NE', 0.6, 4.0, 1),
            target(b2.id, 0, 1, 1.9, 0.38, 2),
        ],
    });
    await prisma.boardBlock.createMany({
        data: [
            moveableBlock(b2.id, 0, 3, BLOCK_TYPE.REFLECT_BLOCK, 1),
            moveableBlock(b2.id, 3, 1, BLOCK_TYPE.REFLECT_BLOCK, 2),
        ],
    });

    // ── MEDIUM — lr-003 + lr-004 ──────────────────────────────────────────────

    const mediumLevel = await prisma.level.create({ data: { name: 'Medium', isDemo: false } });

    // lr-003 : emitter(3,0,'NE')  target(2,1)  target(0,0)  moveable reflect-block(4,3)
    const b3 = await prisma.board.create({
        data: { levelId: mediumLevel.id, name: 'lr-003', gridX: 5, gridY: 5 },
    });
    await prisma.boardCell.createMany({
        data: [
            emitter(b3.id, 3, 0, 'NE', 0.4, 3.4, 1),
            target(b3.id, 2, 1, 1.2, 2.6, 2),
            target(b3.id, 0, 0, 0.8, 0.54, 3),
        ],
    });
    await prisma.boardBlock.create({ data: moveableBlock(b3.id, 4, 3, BLOCK_TYPE.REFLECT_BLOCK, 1) });

    // lr-004 : emitter(5,0,'NE')  target(0,1)
    //          fixed reflect-block(2,3)  moveable reflect-block(4,4)
    const b4 = await prisma.board.create({
        data: { levelId: mediumLevel.id, name: 'lr-004', gridX: 6, gridY: 6 },
    });
    await prisma.boardCell.createMany({
        data: [
            emitter(b4.id, 5, 0, 'NE', 0.5, 5.3, 1),
            target(b4.id, 0, 1, 1.36, 0.12, 2),
        ],
    });
    await prisma.boardBlock.createMany({
        data: [
            fixedBlock(b4.id, 2, 3, BLOCK_TYPE.REFLECT_BLOCK, 1),
            moveableBlock(b4.id, 4, 4, BLOCK_TYPE.REFLECT_BLOCK, 2),
        ],
    });

    // ── HARD — lr-005 ─────────────────────────────────────────────────────────

    const hardLevel = await prisma.level.create({ data: { name: 'Hard', isDemo: false } });

    // lr-005 : emitter(6,0,'NE')  target(1,3)  target(0,4)
    //          moveable reflect-block(0,0) + (5,5)
    const b5 = await prisma.board.create({
        data: { levelId: hardLevel.id, name: 'lr-005', gridX: 7, gridY: 7 },
    });
    await prisma.boardCell.createMany({
        data: [
            emitter(b5.id, 6, 0, 'NE', 0.5, 6.4, 1),
            target(b5.id, 1, 3, 3.1, 1.48, 2),
            target(b5.id, 0, 4, 4.4, 0.18, 3),
        ],
    });
    await prisma.boardBlock.createMany({
        data: [
            moveableBlock(b5.id, 0, 0, BLOCK_TYPE.REFLECT_BLOCK, 1),
            moveableBlock(b5.id, 5, 5, BLOCK_TYPE.REFLECT_BLOCK, 2),
        ],
    });

    // ── DEMO — tutorial ───────────────────────────────────────────────────────

    const demoLevel = await prisma.level.create({ data: { name: 'Demo', isDemo: true } });

    const bd = await prisma.board.create({
        data: { levelId: demoLevel.id, name: 'Demo Board', gridX: 5, gridY: 5 },
    });
    await prisma.boardCell.createMany({
        data: [
            emitter(bd.id, 2, 0, 'NE', 0.5, 2.5, 1),
            target(bd.id, 0, 2, 2.5, 0.5, 2),
        ],
    });
    await prisma.boardBlock.create({ data: moveableBlock(bd.id, 4, 0, BLOCK_TYPE.REFLECT_BLOCK, 1) });

    // demo easy board : same layout as lr-001
    const bde = await prisma.board.create({
        data: { levelId: demoLevel.id, name: 'Demo Easy Board', gridX: 5, gridY: 5 },
    });
    await prisma.boardCell.createMany({
        data: [
            emitter(bde.id, 3, 0, 'NE', 0.5, 3.08, 1),
            target(bde.id, 0, 0, 0.9, 0.32, 2),
        ],
    });
    await prisma.boardBlock.create({ data: moveableBlock(bde.id, 3, 3, BLOCK_TYPE.REFLECT_BLOCK, 1) });

    // ── StageConfig ───────────────────────────────────────────────────────────

    const stage = await prisma.stageConfig.create({
        data: {
            stageId:    STAGE_ID,
            timeLimit:  600,
            enableDemo: true,
            isEnabled:  true,
        },
    });

    await prisma.stageLevelConfig.createMany({
        data: [
            { stageConfigId: stage.id, levelId: easyLevel.id,   boardCount: 2, order: 1 },
            { stageConfigId: stage.id, levelId: mediumLevel.id, boardCount: 2, order: 2 },
            { stageConfigId: stage.id, levelId: hardLevel.id,   boardCount: 1, order: 3 },
        ],
    });

    await prisma.stageDemoLevelConfig.create({
        data: { stageConfigId: stage.id, levelId: demoLevel.id, boardCount: 2, order: 1 },
    });

    // ── Summary ───────────────────────────────────────────────────────────────

    console.log('✓ Seed complete.\n');
    console.log(`Stage ID : ${STAGE_ID}  (enableDemo: true  timeLimit: 600s  totalRounds: 5)\n`);
    console.log(`Easy   level : ${easyLevel.id}`);
    console.log(`  lr-001 board : ${b1.id}  emitter(3,0) NE  target(0,0)  block(3,3)`);
    console.log(`  lr-002 board : ${b2.id}  emitter(4,0) NE  target(0,1)  blocks(0,3)(3,1)`);
    console.log(`Medium level : ${mediumLevel.id}`);
    console.log(`  lr-003 board : ${b3.id}  emitter(3,0) NE  targets(2,1)(0,0)  block(4,3)`);
    console.log(`  lr-004 board : ${b4.id}  emitter(5,0) NE  target(0,1)  fixedBlock(2,3)  block(4,4)`);
    console.log(`Hard   level : ${hardLevel.id}`);
    console.log(`  lr-005 board : ${b5.id}  emitter(6,0) NE  targets(1,3)(0,4)  blocks(0,0)(5,5)`);
    console.log(`Demo   level : ${demoLevel.id}`);
    console.log(`  demo  board      : ${bd.id}  emitter(2,0) NE  target(0,2)  block(4,0)`);
    console.log(`  demo easy board  : ${bde.id}  emitter(3,0) NE  target(0,0)  block(3,3)`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
