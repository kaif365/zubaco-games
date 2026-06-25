/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * PHASE 8.5 — Full tournament journey E2E driver.
 *
 * Exercises the REAL platform services (no mocks): registration → weekly bucket
 * assignment → tournament game start (server-authored board) → server-authoritative
 * scoring → stage elimination (bottom X%) → advance survivors → final winner.
 *
 * Run with the platform's compiled output:
 *   node scripts/tournament-e2e.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/common/prisma/prisma.service');
const { TournamentService } = require('../dist/src/tournament/tournament.service');
const { EliminationService } = require('../dist/src/tournament/elimination.service');

const log = (...a) => console.log(...a);
const hr = (t) => log(`\n${'═'.repeat(64)}\n${t}\n${'═'.repeat(64)}`);

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const tournament = app.get(TournamentService);
  const elimination = app.get(EliminationService);

  hr('CLEANUP — remove any previous E2E run');
  // Delete E2E users (cascades sessions/entries) and the E2E season (cascades stages/cohorts).
  const oldUsers = await prisma.user.findMany({ where: { phone: { startsWith: '+9100000' } }, select: { id: true } });
  if (oldUsers.length) {
    await prisma.user.deleteMany({ where: { id: { in: oldUsers.map((u) => u.id) } } });
    log(`  removed ${oldUsers.length} prior E2E users`);
  }
  await prisma.season.deleteMany({ where: { name: { startsWith: 'E2E ' } } });

  hr('SETUP — create an ACTIVE season with 2 stages');
  const now = new Date();
  const season = await prisma.season.create({
    data: {
      name: 'E2E Championship',
      description: 'Automated end-to-end journey test',
      start_date: now,
      end_date: new Date(now.getTime() + 30 * 864e5),
      status: 'ACTIVE',
      entry_fee: 0,
      registration_weeks: 5,
      bucketing_stage: 1, // stage 1 eliminates within weekly buckets
    },
  });
  const stage1 = await prisma.seasonStage.create({
    data: {
      season_id: season.id,
      stage_number: 1,
      name: 'Qualifier',
      open_date: now,
      close_date: new Date(now.getTime() + 7 * 864e5),
      elimination_pct: 50, // bottom 50% out
      status: 'OPEN',
      stage_games: { create: [{ game_type: 'RAPID_CATEGORY_SORT', game_order: 1 }] },
    },
    include: { stage_games: true },
  });
  const stage2 = await prisma.seasonStage.create({
    data: {
      season_id: season.id,
      stage_number: 2,
      name: 'Final',
      open_date: new Date(now.getTime() + 7 * 864e5),
      close_date: new Date(now.getTime() + 14 * 864e5),
      elimination_pct: 70, // leaves a single winner from 3
      status: 'LOCKED',
      stage_games: { create: [{ game_type: 'RAPID_CATEGORY_SORT', game_order: 1 }] },
    },
    include: { stage_games: true },
  });
  log(`  season ${season.id} (${season.status})`);
  log(`  stage 1 "${stage1.name}" OPEN  elim ${stage1.elimination_pct}%  games=${stage1.stage_games.length}`);
  log(`  stage 2 "${stage2.name}" LOCKED elim ${stage2.elimination_pct}% games=${stage2.stage_games.length}`);

  hr('PLAYERS — create 6 users');
  const defs = [
    { name: 'Alice', s1: 9, s2: 5 },
    { name: 'Bob', s1: 8, s2: 9 },
    { name: 'Carol', s1: 7, s2: 7 },
    { name: 'Dave', s1: 6, s2: 0 },
    { name: 'Erin', s1: 5, s2: 0 },
    { name: 'Frank', s1: 4, s2: 0 },
  ];
  const users = [];
  for (let i = 0; i < defs.length; i++) {
    const u = await prisma.user.create({
      data: {
        username: `e2e_${defs[i].name.toLowerCase()}`,
        display_name: defs[i].name,
        phone: `+910000010${i}`,
        wallet: { create: {} },
      },
    });
    users.push({ ...defs[i], id: u.id });
    log(`  ${defs[i].name.padEnd(6)} ${u.id}`);
  }

  hr('REGISTER — all 6 enter the season');
  for (const u of users) {
    const r = await tournament.registerForSeason(u.id, season.id);
    log(`  ${u.name.padEnd(6)} → bucket "${r.cohort}" (week ${r.registration_week})`);
  }

  // Helper: play a stage game for a user with a controlled "correct" count.
  async function play(u, stageNumber, correct) {
    const start = await tournament.startTournamentGame(u.id, season.id, stageNumber, 1);
    const claimed = correct * 10; // honest client claim == server formula (10 pts/correct)
    const res = await tournament.submitTournamentResult(
      u.id,
      start.session_id,
      claimed,
      20000 + Math.floor(Math.random() * 5000),
      { correct, wrong: 0 },
    );
    return res.score;
  }

  hr('STAGE 1 — everyone plays the Qualifier');
  for (const u of users) {
    const score = await play(u, 1, u.s1);
    log(`  ${u.name.padEnd(6)} server score = ${score}`);
  }

  const r1 = await elimination.getStageRankings(stage1.id);
  log('\n  Rankings:');
  r1.rankings.forEach((e) => log(`   #${e.rank} ${e.user.display_name.padEnd(6)} ${e.total_score}`));

  hr('STAGE 1 — run elimination (bottom 50%)');
  const e1 = await elimination.runElimination(stage1.id);
  log(`  ${JSON.stringify(e1)}`);
  const survivors1 = await prisma.seasonEntry.findMany({
    where: { season_id: season.id, status: 'ACTIVE' },
    include: { user: { select: { display_name: true } } },
  });
  const eliminated1 = await prisma.seasonEntry.count({ where: { season_id: season.id, status: 'ELIMINATED' } });
  log(`  survivors: ${survivors1.map((s) => s.user.display_name).join(', ')}`);
  log(`  eliminated: ${eliminated1}`);

  hr('ADVANCE — open the Final stage');
  await prisma.seasonStage.update({ where: { id: stage2.id }, data: { status: 'OPEN' } });
  log('  stage 2 → OPEN');

  hr('STAGE 2 — survivors play the Final');
  for (const u of users) {
    const alive = survivors1.find((s) => s.user.display_name === u.name);
    if (!alive) continue;
    const score = await play(u, 2, u.s2);
    log(`  ${u.name.padEnd(6)} server score = ${score}`);
  }

  const r2 = await elimination.getStageRankings(stage2.id);
  log('\n  Rankings:');
  r2.rankings.forEach((e) => log(`   #${e.rank} ${e.user.display_name.padEnd(6)} ${e.total_score}`));

  hr('STAGE 2 — run elimination (top 1 survives)');
  const e2 = await elimination.runElimination(stage2.id);
  log(`  ${JSON.stringify(e2)}`);

  hr('CROWN — declare the champion + complete the season');
  const finalSurvivor = await prisma.seasonEntry.findFirst({
    where: { season_id: season.id, status: 'ACTIVE' },
    include: { user: { select: { display_name: true } } },
  });
  if (finalSurvivor) {
    await prisma.seasonEntry.update({ where: { id: finalSurvivor.id }, data: { status: 'WINNER' } });
  }
  await prisma.season.update({ where: { id: season.id }, data: { status: 'COMPLETED' } });

  hr('FINAL VERIFICATION');
  const breakdown = await prisma.seasonEntry.groupBy({
    by: ['status'],
    where: { season_id: season.id },
    _count: true,
  });
  log('  Season entries by status:');
  breakdown.forEach((b) => log(`   ${b.status.padEnd(11)} ${b._count}`));
  const champ = await prisma.seasonEntry.findFirst({
    where: { season_id: season.id, status: 'WINNER' },
    include: { user: { select: { display_name: true } } },
  });
  log(`\n  🏆 CHAMPION: ${champ ? champ.user.display_name : 'NONE'}`);

  const pass =
    e1.survived === 3 &&
    e1.eliminated === 3 &&
    e2.survived === 1 &&
    champ &&
    champ.user.display_name === 'Bob';
  log(`\n  RESULT: ${pass ? 'PASS ✅ — full journey register→qualify→eliminate→winner works' : 'FAIL ❌'}`);

  await app.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error('E2E FAILED:', e);
  process.exit(1);
});
