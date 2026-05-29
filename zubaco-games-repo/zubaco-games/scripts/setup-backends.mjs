import { readdirSync, statSync, existsSync, rmSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();

function getBackendProjects(baseDir) {
  const entries = readdirSync(baseDir, { withFileTypes: true });
  const backendProjects = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const groupPath = path.join(baseDir, entry.name);
    const nestedEntries = readdirSync(groupPath, { withFileTypes: true });

    for (const nestedEntry of nestedEntries) {
      if (!nestedEntry.isDirectory()) continue;
      if (!nestedEntry.name.endsWith('-backend')) continue;

      const backendPath = path.join(groupPath, nestedEntry.name);
      const packageJsonPath = path.join(backendPath, 'package.json');

      if (existsSync(packageJsonPath) && statSync(backendPath).isDirectory()) {
        backendProjects.push({
          path: backendPath,
          relativeDir: path.relative(baseDir, backendPath),
        });
      }
    }
  }

  return backendProjects.sort((a, b) => a.path.localeCompare(b.path));
}

function runCommand(projectDir, args) {
  const result = spawnSync('bun', args, {
    cwd: projectDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  return result.status ?? 1;
}

function shouldRunPrismaGenerate(projectDir) {
  return (
    existsSync(path.join(projectDir, 'prisma', 'schema.prisma')) &&
    existsSync(path.join(projectDir, 'prisma.config.ts'))
  );
}

function resetBackendProject(projectDir) {
  const removablePaths = [
    { target: path.join(projectDir, 'generated'), type: 'dir' },
    { target: path.join(projectDir, 'node_modules'), type: 'dir' },
    { target: path.join(projectDir, 'package-lock.json'), type: 'file' },
  ];

  for (const removablePath of removablePaths) {
    if (!existsSync(removablePath.target)) {
      continue;
    }

    if (removablePath.type === 'dir') {
      rmSync(removablePath.target, { recursive: true, force: true });
      continue;
    }

    unlinkSync(removablePath.target);
  }
}

const backendProjects = getBackendProjects(rootDir);

if (backendProjects.length === 0) {
  console.log('No backend projects found.');
  process.exit(0);
}

const failures = [];

for (const backendProject of backendProjects) {
  console.log(`\n=== Setting up ${backendProject.relativeDir} ===`);
  console.log('-> reset install state');
  resetBackendProject(backendProject.path);
  console.log('-> bun install --frozen-lockfile');

  const installExitCode = runCommand(backendProject.path, ['install', '--frozen-lockfile']);
  if (installExitCode !== 0) {
    failures.push({
      project: backendProject.relativeDir,
      step: 'install',
      reason: `Command exited with code ${installExitCode}`,
    });
    continue;
  }

  if (!shouldRunPrismaGenerate(backendProject.path)) {
    continue;
  }

  console.log('-> bun x prisma generate');

  const prismaExitCode = runCommand(backendProject.path, ['x', 'prisma', 'generate']);
  if (prismaExitCode !== 0) {
    failures.push({
      project: backendProject.relativeDir,
      step: 'prisma:generate',
      reason: `Command exited with code ${prismaExitCode}`,
    });
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} backend setup step(s) failed:`);
  for (const failure of failures) {
    console.error(`- ${failure.project} [${failure.step}]: ${failure.reason}`);
  }
  process.exit(1);
}

console.log('\nAll backend setup steps passed.');
