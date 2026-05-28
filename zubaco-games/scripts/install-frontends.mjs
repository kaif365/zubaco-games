import { readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();

function getFrontendDirs(baseDir) {
  const entries = readdirSync(baseDir, { withFileTypes: true });
  const frontendDirs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const groupPath = path.join(baseDir, entry.name);
    const nestedEntries = readdirSync(groupPath, { withFileTypes: true });

    for (const nestedEntry of nestedEntries) {
      if (!nestedEntry.isDirectory()) continue;
      if (!nestedEntry.name.endsWith('-frontend')) continue;

      const frontendPath = path.join(groupPath, nestedEntry.name);
      const packageJsonPath = path.join(frontendPath, 'package.json');

      if (existsSync(packageJsonPath) && statSync(frontendPath).isDirectory()) {
        frontendDirs.push(frontendPath);
      }
    }
  }

  return frontendDirs.sort((a, b) => a.localeCompare(b));
}

const frontendDirs = getFrontendDirs(rootDir);

if (frontendDirs.length === 0) {
  console.log('No frontend projects found.');
  process.exit(0);
}

for (const frontendDir of frontendDirs) {
  const relativeDir = path.relative(rootDir, frontendDir);
  console.log(`\nInstalling dependencies in ${relativeDir}...`);

  const result = spawnSync('npm', ['install'], {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(`\nInstall failed in ${relativeDir}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nAll frontend dependencies installed successfully.');
