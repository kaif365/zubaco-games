import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { lookup } from 'node:dns';
import { hashPassword } from '../src/admin/password.util';

function getPgSslConfig(databaseUrl: URL) {
    const sslMode = databaseUrl.searchParams.get('sslmode')?.toLowerCase();

    if (!sslMode || sslMode === 'disable') {
        return false;
    }

    if (sslMode === 'require' || sslMode === 'prefer' || sslMode === 'allow') {
        return {
            rejectUnauthorized: false,
            servername: databaseUrl.hostname,
        };
    }

    return true;
}

function resolveIPv4(hostname: string): Promise<string> {
    return new Promise((resolve, reject) => {
        lookup(hostname, { family: 4 }, (err, address) => {
            if (err) reject(err);
            else resolve(address);
        });
    });
}

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const STAGES = [
    { stage_number: 1, stage_name: 'The Divine Echo of Precision' },
    { stage_number: 2, stage_name: 'The Kinetic Pulse' },
    { stage_number: 3, stage_name: 'The Mind Labyrinth' },
    { stage_number: 4, stage_name: 'The Crucible of Will' },
    { stage_number: 5, stage_name: 'The Final Reckoning' },
];

const GAMES: Array<{
    name: string;
    game_type: 'ARROWS' | 'SEQUENCE_RECALL' | 'INFINITY_LOOP' | 'BLOCK_FILL' | 'MEMORY_CARD_MATCHING' | 'SLIDING_PUZZLE' | 'SUDOKU' | 'MAZE_NAVIGATION' | 'SPOT_THE_DIFFERENCE' | 'LOGIC_REFLECTOR';
    stage_numbers: number[];
    preview_duration_seconds?: number;
    mismatch_display_duration_seconds?: number;
    game_config?: Record<string, unknown>;
}> = [
    { name: 'Arrows', game_type: 'ARROWS', stage_numbers: [1] },
    { name: 'Sequence Recall', game_type: 'SEQUENCE_RECALL', stage_numbers: [1] },
    { name: 'Infinity Loop', game_type: 'INFINITY_LOOP', stage_numbers: [1] },
    { name: 'Block Fill', game_type: 'BLOCK_FILL', stage_numbers: [1] },
    {
        name: 'Memory Card Matching',
        game_type: 'MEMORY_CARD_MATCHING',
        stage_numbers: [1],
        preview_duration_seconds: 3,
        mismatch_display_duration_seconds: 1,
        game_config: {
            game_time_limit_seconds: 60,
        },
    },
    {
        name: 'Sliding Puzzle',
        game_type: 'SLIDING_PUZZLE',
        stage_numbers: [1],
        game_config: {
            display_time: 5,
        },
    },
    { name: 'Sudoku', game_type: 'SUDOKU', stage_numbers: [2] },
    { name: 'Maze Navigation', game_type: 'MAZE_NAVIGATION', stage_numbers: [1] },
    { name: 'Spot the Difference', game_type: 'SPOT_THE_DIFFERENCE', stage_numbers: [1] },
    { name: 'Logic Reflector', game_type: 'LOGIC_REFLECTOR', stage_numbers: [1] },
];

const TOURNAMENTS = [{ name: 'Founders Cup', stage_numbers: [1, 2, 3] }];

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || 'admin@ZUBACO.com';
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'Admin@123456';

async function seedAdmin(prisma: PrismaClient) {
    const password = await hashPassword(ADMIN_PASSWORD);

    await prisma.admin.upsert({
        where: { email: ADMIN_EMAIL },
        update: { password },
        create: {
            email: ADMIN_EMAIL,
            password,
        },
    });

    console.log(`Seeded admin: ${ADMIN_EMAIL}`);
}

async function seedGames(prisma: PrismaClient) {
    const seededStages = new Map<number, string>();

    for (const stageSeed of STAGES) {
        const existing = await prisma.stage.findFirst({
            where: { stage_number: stageSeed.stage_number, deleted_at: null },
        });

        const stage = existing ?? await prisma.stage.create({ data: stageSeed });

        seededStages.set(stage.stage_number, stage.id);
    }

    for (const gameSeed of GAMES) {
        const mcmFields = {
            ...(gameSeed.preview_duration_seconds !== undefined && { preview_duration_seconds: gameSeed.preview_duration_seconds }),
            ...(gameSeed.mismatch_display_duration_seconds !== undefined && { mismatch_display_duration_seconds: gameSeed.mismatch_display_duration_seconds }),
            ...(gameSeed.game_config && { game_config: gameSeed.game_config as Prisma.InputJsonValue }),
        };

        const game = await prisma.game.upsert({
            where: { name: gameSeed.name },
            update: {},
            create: { name: gameSeed.name, game_type: gameSeed.game_type, ...mcmFields },
        });

        const stageIds = gameSeed.stage_numbers.map((stageNumber) => {
            const stageId = seededStages.get(stageNumber);

            if (!stageId) {
                throw new Error(`Stage ${stageNumber} is missing from seed data`);
            }

            return stageId;
        });

        for (const stage_id of stageIds) {
            await prisma.gameStage.upsert({
                where: {
                    game_id_stage_id: {
                        game_id: game.id,
                        stage_id,
                    },
                },
                update: {},
                create: {
                    game_id: game.id,
                    stage_id,
                },
            });
        }

        console.log(
            `Seeded game: ${gameSeed.name} (${gameSeed.stage_numbers.length} stage row(s))`,
        );
    }
}

const GAME_CONTENT_TEMPLATE: Record<string, Record<string, unknown>> = {
    EN: {
        pages: [
            {
                visible_in_app: true,
                title: 'About',
                description: 'Test your reflexes and focus in this exciting game.',
                point_type: 'UNORDERED',
                points: [
                    { title: 'Fun', description: 'Enjoy a fast-paced challenge.' },
                    { title: 'Skill', description: 'Improve your reaction time.' },
                ],
            },
            {
                visible_in_app: true,
                title: 'How to Play',
                description: 'Follow the instructions carefully.',
                point_type: 'ORDERED',
                points: [
                    { title: 'Step 1', description: 'Read the on-screen prompt.' },
                    { title: 'Step 2', description: 'Respond as quickly as possible.' },
                    { title: 'Step 3', description: 'Score points for correct answers.' },
                ],
            },
            {
                visible_in_app: true,
                title: 'Scoring Rules',
                description: 'Points are awarded based on speed and accuracy.',
                point_type: 'UNORDERED',
                points: [
                    { title: 'Correct', description: '+10 points per correct answer.' },
                    { title: 'Wrong', description: '-5 points per mistake.' },
                ],
            },
        ],
        play_now_button: 'Play Now',
        learn_how_to_play: 'Learn How to Play',
    },
    HI: {
        pages: [
            {
                visible_in_app: true,
                title: 'परिचय',
                description: 'इस रोमांचक खेल में अपनी प्रतिक्रिया और एकाग्रता परखें।',
                point_type: 'UNORDERED',
                points: [
                    { title: 'मनोरंजन', description: 'तेज़ गति की चुनौती का आनंद लें।' },
                    { title: 'कौशल', description: 'अपनी प्रतिक्रिया समय सुधारें।' },
                ],
            },
            {
                visible_in_app: true,
                title: 'कैसे खेलें',
                description: 'निर्देशों का ध्यानपूर्वक पालन करें।',
                point_type: 'ORDERED',
                points: [
                    { title: 'चरण 1', description: 'स्क्रीन पर दिए संकेत पढ़ें।' },
                    { title: 'चरण 2', description: 'जितनी जल्दी हो सके प्रतिक्रिया दें।' },
                    { title: 'चरण 3', description: 'सही उत्तरों के लिए अंक अर्जित करें।' },
                ],
            },
            {
                visible_in_app: true,
                title: 'स्कोरिंग नियम',
                description: 'अंक गति और सटीकता के आधार पर दिए जाते हैं।',
                point_type: 'UNORDERED',
                points: [
                    { title: 'सही', description: 'प्रति सही उत्तर +10 अंक।' },
                    { title: 'गलत', description: 'प्रति गलती -5 अंक।' },
                ],
            },
        ],
        play_now_button: 'अभी खेलें',
        learn_how_to_play: 'खेलना सीखें',
    },
};

async function seedGameContents(prisma: PrismaClient) {
    // Find all game-stage pairs from game_stages table
    const gameStages = await prisma.gameStage.findMany({
        where: { deleted_at: null },
        include: {
            game: { select: { id: true, name: true } },
            stage: { select: { id: true, stage_name: true } },
        },
    });

    for (const gs of gameStages) {
        for (const language of ['EN', 'HI'] as const) {
            const existing = await prisma.gameContent.findFirst({
                where: {
                    game_id: gs.game_id,
                    stage_id: gs.stage_id,
                    language,
                    deleted_at: null,
                },
            });

            if (!existing) {
                await prisma.gameContent.create({
                    data: {
                        game_id: gs.game_id,
                        stage_id: gs.stage_id,
                        language,
                        content: GAME_CONTENT_TEMPLATE[language] as Prisma.InputJsonValue,
                    },
                });
            }
        }

        console.log(
            `Seeded content for game "${gs.game.name}" — stage "${gs.stage.stage_name}" (EN + HI)`,
        );
    }
}

async function seedTournaments(prisma: PrismaClient) {
    const stages = await prisma.stage.findMany({
        select: {
            id: true,
            stage_number: true,
        },
    });
    const seededStages = new Map(stages.map((stage) => [stage.stage_number, stage.id]));

    for (const tournamentSeed of TOURNAMENTS) {
        const tournament = await prisma.tournament.upsert({
            where: { name: tournamentSeed.name },
            update: {},
            create: { name: tournamentSeed.name },
        });

        const stageIds = tournamentSeed.stage_numbers.map((stageNumber) => {
            const stageId = seededStages.get(stageNumber);

            if (!stageId) {
                throw new Error(`Stage ${stageNumber} is missing from seed data`);
            }

            return stageId;
        });

        for (const stage_id of stageIds) {
            await prisma.tournamentStage.upsert({
                where: {
                    tournament_id_stage_id: {
                        tournament_id: tournament.id,
                        stage_id,
                    },
                },
                update: {},
                create: {
                    tournament_id: tournament.id,
                    stage_id,
                },
            });
        }

        console.log(
            `Seeded tournament: ${tournamentSeed.name} (${tournamentSeed.stage_numbers.length} stage row(s))`,
        );
    }
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required to run seed');
    }

    const encodedUrl = databaseUrl.replace(
        /^(postgresql:\/\/[^:]+):([^@]+)@/,
        (_, userPart, pass) => `${userPart}:${encodeURIComponent(pass)}@`,
    );
    const dbUrl = new URL(encodedUrl);
    const host = await resolveIPv4(dbUrl.hostname).catch(() => dbUrl.hostname);
    const pool = new Pool({
        host,
        port: Number(dbUrl.port) || 5432,
        database: dbUrl.pathname.slice(1),
        user: dbUrl.username,
        password: decodeURIComponent(dbUrl.password),
        ssl: getPgSslConfig(dbUrl),
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        await seedAdmin(prisma);
        await seedGames(prisma);
        await seedGameContents(prisma);
        await seedTournaments(prisma);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main()
    .then(() => {
        console.log('Database seed completed');
    })
    .catch((error) => {
        console.error('Database seed failed');
        console.error(error);
        process.exit(1);
    });
