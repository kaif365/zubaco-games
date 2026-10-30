/**
 * ZUBACO PLATFORM - MASTER BUILD VERIFICATION RUNNER
 * Usage:
 *   node scripts/test-all-builds.js [--group=web-lobby|platform|admin|games-fe|games-be|all] [--target=<id>]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const REPORT_FILE = path.join(ROOT_DIR, 'AboutGameAndToDo', 'sectionone', 'section1.1_build_report.txt');

// All 43 Target Sub-projects in Zubaco Ecosystem
const TARGETS = [
  // Web Lobby
  { id: 'WL-01', name: 'Web Lobby', group: 'web-lobby', dir: 'zubaco-web-lobby', cmd: 'npm', args: ['run', 'build'] },

  // Platform Core
  { id: 'PL-01', name: 'Platform Core', group: 'platform', dir: 'zubaco-platform', cmd: 'npm', args: ['run', 'build'] },

  // Admin Panel
  { id: 'AP-01', name: 'Admin Frontend', group: 'admin', dir: 'zubaco-admin-panel-repo/zubaco-admin-panel/frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'AP-02', name: 'Admin Backend', group: 'admin', dir: 'zubaco-admin-panel-repo/zubaco-admin-panel/backend', cmd: 'npm', args: ['run', 'build'] },

  // 20 Game Frontends
  { id: 'FE-01', name: 'Sequence Recall (FE)', group: 'games-fe', dir: 'zubaco-games/sequence-recall/sequence-recall-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-02', name: 'Memory Cards (FE)', group: 'games-fe', dir: 'zubaco-games/memory-card-matching/memory-card-matching-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-03', name: 'Flash Spot (FE)', group: 'games-fe', dir: 'zubaco-games/flash-spot/flash-spot-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-04', name: 'Object Placement (FE)', group: 'games-fe', dir: 'zubaco-games/object-placement/object-placement-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-05', name: 'Memory Groups (FE)', group: 'games-fe', dir: 'zubaco-games/memory-groups/memory-groups-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-06', name: 'Sliding Puzzle (FE)', group: 'games-fe', dir: 'zubaco-games/sliding-puzzle/sliding-puzzle-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-07', name: 'Block Fill (FE)', group: 'games-fe', dir: 'zubaco-games/block-fill/block-fill-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-08', name: 'Colour Sort (FE)', group: 'games-fe', dir: 'zubaco-games/colour-sort/colour-sort-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-09', name: 'Rapid Sort (FE)', group: 'games-fe', dir: 'zubaco-games/rapid-sort/rapid-sort-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-10', name: 'Maze Navigation (FE)', group: 'games-fe', dir: 'zubaco-games/maze-navigation/maze-navigation-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-11', name: 'Infinity Loop (FE)', group: 'games-fe', dir: 'zubaco-games/Infinity-loop/infinity-loop-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-12', name: 'Word Unscramble (FE)', group: 'games-fe', dir: 'zubaco-games/word-unscramble/word-unscramble-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-13', name: 'True / False (FE)', group: 'games-fe', dir: 'zubaco-games/true-false/true-false-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-14', name: 'Arrows (FE)', group: 'games-fe', dir: 'zubaco-games/arrows/arrows-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-15', name: 'Logic Reflector (FE)', group: 'games-fe', dir: 'zubaco-games/logic-reflector/logic-reflector-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-16', name: 'Number Grid (FE)', group: 'games-fe', dir: 'zubaco-games/number-grid/number-grid-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-17', name: 'Live Route (FE)', group: 'games-fe', dir: 'zubaco-games/live-route-builder/live-route-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-18', name: 'Reflex Endurance (FE)', group: 'games-fe', dir: 'zubaco-games/reflex-endurance/reflex-endurance-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-19', name: 'Pattern Survival (FE)', group: 'games-fe', dir: 'zubaco-games/pattern-survival/pattern-survival-frontend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'FE-20', name: 'Speed Typing (FE)', group: 'games-fe', dir: 'zubaco-games/speed-typing/speed-typing-frontend', cmd: 'npm', args: ['run', 'build'] },

  // 20 Game Backends
  { id: 'BE-01', name: 'Sequence Recall (BE)', group: 'games-be', dir: 'zubaco-games/sequence-recall/sequence-recall-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-02', name: 'Memory Cards (BE)', group: 'games-be', dir: 'zubaco-games/memory-card-matching/memory-card-matching-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-03', name: 'Flash Spot (BE)', group: 'games-be', dir: 'zubaco-games/flash-spot/flash-spot-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-04', name: 'Object Placement (BE)', group: 'games-be', dir: 'zubaco-games/object-placement/object-placement-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-05', name: 'Memory Groups (BE)', group: 'games-be', dir: 'zubaco-games/memory-groups/memory-groups-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-06', name: 'Sliding Puzzle (BE)', group: 'games-be', dir: 'zubaco-games/sliding-puzzle/sliding-puzzle-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-07', name: 'Block Fill (BE)', group: 'games-be', dir: 'zubaco-games/block-fill/block-fill-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-08', name: 'Colour Sort (BE)', group: 'games-be', dir: 'zubaco-games/colour-sort/colour-sort-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-09', name: 'Rapid Sort (BE)', group: 'games-be', dir: 'zubaco-games/rapid-sort/rapid-sort-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-10', name: 'Maze Navigation (BE)', group: 'games-be', dir: 'zubaco-games/maze-navigation/maze-navigation-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-11', name: 'Infinity Loop (BE)', group: 'games-be', dir: 'zubaco-games/Infinity-loop/Infinity-Loop-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-12', name: 'Word Unscramble (BE)', group: 'games-be', dir: 'zubaco-games/word-unscramble/word-unscramble-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-13', name: 'True / False (BE)', group: 'games-be', dir: 'zubaco-games/true-false/true-false-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-14', name: 'Arrows (BE)', group: 'games-be', dir: 'zubaco-games/arrows/arrows-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-15', name: 'Logic Reflector (BE)', group: 'games-be', dir: 'zubaco-games/logic-reflector/logic-reflector-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-16', name: 'Number Grid (BE)', group: 'games-be', dir: 'zubaco-games/number-grid/number-grid-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-17', name: 'Live Route (BE)', group: 'games-be', dir: 'zubaco-games/live-route-builder/live-route-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-18', name: 'Reflex Endurance (BE)', group: 'games-be', dir: 'zubaco-games/reflex-endurance/reflex-endurance-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-19', name: 'Pattern Survival (BE)', group: 'games-be', dir: 'zubaco-games/pattern-survival/pattern-survival-backend', cmd: 'npm', args: ['run', 'build'] },
  { id: 'BE-20', name: 'Speed Typing (BE)', group: 'games-be', dir: 'zubaco-games/speed-typing/speed-typing-backend', cmd: 'npm', args: ['run', 'build'] },
];

const isWindows = process.platform === 'win32';

// Parse command line arguments
const args = process.argv.slice(2);
const groupArg = args.find(a => a.startsWith('--group='));
const targetArg = args.find(a => a.startsWith('--target='));
const autoInstall = args.includes('--install');
const filterGroup = groupArg ? groupArg.split('=')[1].toLowerCase() : null;
const filterTarget = targetArg ? targetArg.split('=')[1].toUpperCase() : null;

let selectedTargets = TARGETS;
if (filterGroup && filterGroup !== 'all') {
  selectedTargets = selectedTargets.filter(t => t.group === filterGroup);
}
if (filterTarget) {
  selectedTargets = selectedTargets.filter(t => t.id === filterTarget || t.name.toLowerCase().includes(filterTarget.toLowerCase()));
}

console.log(`========================================================================`);
console.log(`       ZUBACO PLATFORM - MASTER BUILD VERIFICATION RUNNER`);
console.log(`========================================================================`);
console.log(`Selected Targets: ${selectedTargets.length} of ${TARGETS.length}`);
if (filterGroup) console.log(`Group Filter    : ${filterGroup}`);
if (filterTarget) console.log(`Target Filter   : ${filterTarget}`);
console.log(`Auto-Install    : ${autoInstall ? 'ENABLED' : 'DISABLED (use --install if node_modules missing)'}`);
console.log(`------------------------------------------------------------------------\n`);

function runCommand(cmd, args, cwd, timeoutMs = 180000) {
  const isWindows = process.platform === 'win32';
  const execCmd = isWindows ? `${cmd}.cmd` : cmd;

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const start = Date.now();

    const child = spawn(execCmd, args, {
      cwd,
      shell: true,
      env: { ...process.env, CI: 'true', NODE_ENV: 'production' }
    });

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ code: -1, stdout, stderr, durationMs: Date.now() - start, timedOut: true });
    }, timeoutMs);

    child.on('close', code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, durationMs: Date.now() - start, timedOut: false });
    });

    child.on('error', err => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: err.message, durationMs: Date.now() - start, timedOut: false });
    });
  });
}

async function runTarget(target) {
  const fullPath = path.resolve(ROOT_DIR, target.dir);
  console.log(`[${target.id}] Preparing ${target.name} (${target.dir})...`);
  
  if (!fs.existsSync(fullPath)) {
    return {
      target,
      success: false,
      durationMs: 0,
      error: `Directory not found: ${fullPath}`
    };
  }

  const nodeModulesPath = path.join(fullPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    if (autoInstall) {
      console.log(`  -> Installing dependencies in ${target.dir}...`);
      const installRes = await runCommand('npm', ['install', '--no-audit', '--no-fund'], fullPath, 300000);
      if (installRes.code !== 0) {
        return {
          target,
          success: false,
          durationMs: installRes.durationMs,
          error: `npm install failed with exit code ${installRes.code}`,
          stderr: installRes.stderr
        };
      }
    } else {
      return {
        target,
        success: false,
        durationMs: 0,
        error: `node_modules missing. Run with --install to install automatically.`
      };
    }
  }

  // Check if prisma schema exists and generate client if needed
  const prismaSchema = path.join(fullPath, 'prisma', 'schema.prisma');
  if (fs.existsSync(prismaSchema)) {
    console.log(`  -> Running prisma generate for ${target.name}...`);
    await runCommand('npx', ['prisma', 'generate'], fullPath, 60000);
  }

  console.log(`  -> Running build: ${target.cmd} ${target.args.join(' ')}`);
  const buildRes = await runCommand(target.cmd, target.args, fullPath, 180000);
  const success = buildRes.code === 0;

  if (success) {
    console.log(`  -> SUCCESS [${target.id}] in ${(buildRes.durationMs / 1000).toFixed(1)}s`);
  } else {
    console.error(`  -> FAILED  [${target.id}] (exit code ${buildRes.code}) in ${(buildRes.durationMs / 1000).toFixed(1)}s`);
    if (buildRes.stderr.trim()) {
      const lines = buildRes.stderr.trim().split('\n').slice(-5).join('\n');
      console.error(`     Last error output:\n${lines}`);
    }
  }

  return {
    target,
    success,
    exitCode: buildRes.code,
    durationMs: buildRes.durationMs,
    stdout: buildRes.stdout,
    stderr: buildRes.stderr,
    error: buildRes.timedOut ? 'TIMED OUT after 180s' : (success ? null : `Exit code ${buildRes.code}`)
  };
}

async function main() {
  const results = [];
  const startAll = Date.now();

  for (const target of selectedTargets) {
    const res = await runTarget(target);
    results.push(res);
  }

  const totalTime = ((Date.now() - startAll) / 1000).toFixed(1);
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n========================================================================`);
  console.log(`                         BUILD RUN SUMMARY`);
  console.log(`========================================================================`);
  console.log(`Total Targets Tested : ${results.length}`);
  console.log(`Passed (Exit 0)      : ${passed.length}`);
  console.log(`Failed               : ${failed.length}`);
  console.log(`Total Execution Time : ${totalTime}s`);
  console.log(`========================================================================`);

  if (failed.length > 0) {
    console.log(`\nFAILURES SUMMARY:`);
    for (const f of failed) {
      console.log(`  - [${f.target.id}] ${f.target.name}: ${f.error || `Exit code ${f.exitCode}`}`);
    }
  }

  // Save report to AboutGameAndToDo/sectionone/section1.1_build_report.txt
  const reportLines = [
    `================================================================================`,
    `                     SECTION 1.1 BUILD VERIFICATION REPORT`,
    `================================================================================`,
    `Date & Time          : ${new Date().toISOString()}`,
    `Filter Group         : ${filterGroup || 'ALL'}`,
    `Total Tested         : ${results.length}`,
    `Passed (Clean Build) : ${passed.length}`,
    `Failed               : ${failed.length}`,
    `Total Duration       : ${totalTime}s`,
    `--------------------------------------------------------------------------------`,
    `TARGET RESULTS:`,
    ...results.map(r => `[${r.success ? 'PASS' : 'FAIL'}] [${r.target.id}] ${r.target.name.padEnd(25)} (${(r.durationMs/1000).toFixed(1)}s)${r.success ? '' : ' ERR: ' + (r.error || `Exit code ${r.exitCode}`)}`),
    `================================================================================`
  ];

  if (failed.length > 0) {
    reportLines.push(`\nDETAILED FAILURE LOGS:`);
    for (const f of failed) {
      reportLines.push(`--------------------------------------------------------------------------------`);
      reportLines.push(`Target: [${f.target.id}] ${f.target.name} (${f.target.dir})`);
      reportLines.push(`Error : ${f.error || `Exit code ${f.exitCode}`}`);
      if (f.stderr) reportLines.push(`Stderr:\n${f.stderr.trim()}`);
      if (f.stdout && !f.stderr) reportLines.push(`Stdout:\n${f.stdout.trim()}`);
    }
  }

  fs.writeFileSync(REPORT_FILE, reportLines.join('\n'), 'utf8');
  console.log(`\nDetailed report written to: ${REPORT_FILE}\n`);

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
