import * as path from 'path';
import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function resolveIPv4(hostname: string): Promise<string> {
  if (hostname === 'localhost' || isIP(hostname) !== 0) return Promise.resolve(hostname);
  return new Promise((resolve, reject) => {
    lookup(hostname, { family: 4 }, (err, address) => { err ? reject(err) : resolve(address); });
  });
}

async function main() {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  const host = await resolveIPv4(dbUrl.hostname).catch(() => dbUrl.hostname);
  const pool = new Pool({
    host,
    port: Number(dbUrl.port) || 5432,
    database: decodeURIComponent(dbUrl.pathname.slice(1)),
    user: decodeURIComponent(dbUrl.password ? dbUrl.username : 'zubaco'),
    password: decodeURIComponent(dbUrl.password || 'zubaco_dev_2024'),
    ssl: dbUrl.searchParams.get('sslmode') === 'disable' ? false : { rejectUnauthorized: false, servername: dbUrl.hostname },
    connectionTimeoutMillis: 20000,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  await prisma.gameSessionBoard.deleteMany({});
  const result = await prisma.board.deleteMany({});
  console.log(`Deleted ${result.count} boards`);
  await prisma.$disconnect();
  await pool.end();
}

main();
