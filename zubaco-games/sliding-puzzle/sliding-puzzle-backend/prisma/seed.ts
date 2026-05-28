import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ─── Seed Data ────────────────────────────────────────────────────────────────

const LEVELS: { name: string; isDemo?: boolean; difficultyScore: number }[] = [
    { name: 'Easy', difficultyScore: 1 },
    { name: 'Medium', difficultyScore: 2 },
    { name: 'Hard', difficultyScore: 3 },
    { name: 'Demo', isDemo: true, difficultyScore: 0 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Seeding Sliding Puzzle database...');

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

    for (const levelSeed of LEVELS) {
        const existing = await prisma.level.findFirst({
            where: { name: levelSeed.name, deletedAt: null },
        });
        const seedIsDemo = levelSeed.isDemo ?? false;
        const seedDifficultyScore = levelSeed.difficultyScore;

        if (!existing) {
            await prisma.level.create({
                data: { name: levelSeed.name, isDemo: seedIsDemo, difficultyScore: seedDifficultyScore },
            });
            console.log(`  + Level "${levelSeed.name}" created`);
        } else {
            const needsUpdate =
                existing.isDemo !== seedIsDemo || existing.difficultyScore !== seedDifficultyScore;
            if (needsUpdate) {
                await prisma.level.update({
                    where: { id: existing.id },
                    data: { isDemo: seedIsDemo, difficultyScore: seedDifficultyScore },
                });
                console.log(
                    `  ~ Level "${levelSeed.name}" updated isDemo=${seedIsDemo} difficultyScore=${seedDifficultyScore}`,
                );
            } else {
                console.log(`  ~ Level "${levelSeed.name}" already exists, skipping`);
            }
        }
    }

    console.log('Database seeded successfully!');
    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
