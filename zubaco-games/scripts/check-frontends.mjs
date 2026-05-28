import { readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const checkMode = process.argv[2] ?? 'all';

if (!['all', 'lint', 'test'].includes(checkMode)) {
  console.error("Invalid mode. Use one of: 'all', 'lint', 'test'.");
  process.exit(1);
}

function getFrontendDirs(baseDir) {
  const entries = readdirSync(baseDir, { withFileTypes: true });
  const frontendDirs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const groupPath = path.join(baseDir, entry.name);
    const nestedEntries = readdirSync(groupPath, { withFileTypes: true });

    for (const nestedEntry of nestedEntries) {
      if (!nestedEntry.isDirectory()) continue;
      if (!nestedEntry.name.endsWith('memory-card-matching-frontend')) continue;

      const frontendPath = path.join(groupPath, nestedEntry.name);
      const packageJsonPath = path.join(frontendPath, 'package.json');

      if (existsSync(packageJsonPath) && statSync(frontendPath).isDirectory()) {
        frontendDirs.push(frontendPath);
      }
    }
  }

  return frontendDirs.sort((a, b) => a.localeCompare(b));
}

function runNpmScript(frontendDir, scriptName) {
  const result = spawnSync('npm', ['run', scriptName], {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  return result.status ?? 1;
}

const frontendDirs = getFrontendDirs(rootDir);

if (frontendDirs.length === 0) {
  console.log('No frontend projects found.');
  process.exit(0);
}

for (const frontendDir of frontendDirs) {
  const relativeDir = path.relative(rootDir, frontendDir);
  console.log(`\n=== Running checks in ${relativeDir} ===`);

  if (checkMode === 'all' || checkMode === 'lint') {
    console.log('-> npm run lint');
    const lintExitCode = runNpmScript(frontendDir, 'lint');
    if (lintExitCode !== 0) {
      console.error(`\nLint failed in ${relativeDir}`);
      process.exit(lintExitCode);
    }
  }

  if (checkMode === 'all' || checkMode === 'test') {
    console.log('-> npm run test');
    const testExitCode = runNpmScript(frontendDir, 'test');
    if (testExitCode !== 0) {
      console.error(`\nTests failed in ${relativeDir}`);
      process.exit(testExitCode);
    }
  }
}

if (checkMode === 'lint') {
  console.log('\nAll frontend lint checks passed.');
} else if (checkMode === 'test') {
  console.log('\nAll frontend test checks passed.');
} else {
  console.log('\nAll frontend lint and test checks passed.');
}
