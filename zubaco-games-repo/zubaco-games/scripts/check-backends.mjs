import { readdirSync, readFileSync, statSync, existsSync, rmSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const checkMode = process.argv[2] ?? 'all';

if (!['all', 'lint', 'test'].includes(checkMode)) {
  console.error("Invalid mode. Use one of: 'all', 'lint', 'test'.");
  process.exit(1);
}

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
          packageJsonPath,
        });
      }
    }
  }

  return backendProjects.sort((a, b) => a.path.localeCompare(b.path));
}

function readPackageJson(packageJsonPath) {
  try {
    return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${packageJsonPath}:`, error);
    process.exit(1);
  }
}

function getScriptCommand(packageJson, scriptName) {
  const scriptValue = packageJson?.scripts?.[scriptName];

  if (typeof scriptValue !== 'string') {
    return null;
  }

  return scriptValue.trim() || null;
}

function runProjectScript(projectDir, scriptName) {
  const result = spawnSync('bun', ['run', scriptName], {
    cwd: projectDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  return result.status ?? 1;
}

function runSetupStep(projectDir, args) {
  const result = spawnSync('bun', args, {
    cwd: projectDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  return result.status ?? 1;
}

function getRequiredScriptCommand(packageJson, scriptName) {
  const scriptCommand = getScriptCommand(packageJson, scriptName);

  if (scriptCommand) {
    return scriptCommand;
  }

  return null;
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
  const relativeDir = path.relative(rootDir, backendProject.path);
  const packageJson = readPackageJson(backendProject.packageJsonPath);

  console.log(`\n=== Running checks in ${relativeDir} ===`);
  console.log('-> reset install state');
  resetBackendProject(backendProject.path);
  console.log('-> bun install --frozen-lockfile');

  const installExitCode = runSetupStep(backendProject.path, ['install', '--frozen-lockfile']);
  if (installExitCode !== 0) {
    failures.push({
      project: relativeDir,
      check: 'setup',
      reason: `bun install exited with code ${installExitCode}`,
    });
    continue;
  }

  if (shouldRunPrismaGenerate(backendProject.path)) {
    console.log('-> bun x prisma generate');

    const prismaExitCode = runSetupStep(backendProject.path, ['x', 'prisma', 'generate']);
    if (prismaExitCode !== 0) {
      failures.push({
        project: relativeDir,
        check: 'setup',
        reason: `bun x prisma generate exited with code ${prismaExitCode}`,
      });
      continue;
    }
  }

  if (checkMode === 'all' || checkMode === 'lint') {
    const lintCommand = getRequiredScriptCommand(packageJson, 'lint');

    if (!lintCommand) {
      failures.push({
        project: relativeDir,
        check: 'lint',
        reason: "Missing or empty 'lint' script in package.json",
      });
    } else {
      console.log(`-> bun run lint (${lintCommand})`);

      const lintExitCode = runProjectScript(backendProject.path, 'lint');
      if (lintExitCode !== 0) {
        failures.push({
          project: relativeDir,
          check: 'lint',
          reason: `Command exited with code ${lintExitCode}`,
        });
      }
    }
  }

  if (checkMode === 'all' || checkMode === 'test') {
    const testCommand = getRequiredScriptCommand(packageJson, 'test');

    if (!testCommand) {
      failures.push({
        project: relativeDir,
        check: 'test',
        reason: "Missing or empty 'test' script in package.json",
      });
    } else {
      console.log(`-> bun run test (${testCommand})`);

      const testExitCode = runProjectScript(backendProject.path, 'test');
      if (testExitCode !== 0) {
        failures.push({
          project: relativeDir,
          check: 'test',
          reason: `Command exited with code ${testExitCode}`,
        });
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} backend check(s) failed:`);
  for (const failure of failures) {
    console.error(`- ${failure.project} [${failure.check}]: ${failure.reason}`);
  }
  process.exit(1);
}

if (checkMode === 'lint') {
  console.log('\nAll backend lint checks passed.');
} else if (checkMode === 'test') {
  console.log('\nAll backend test checks passed.');
} else {
  console.log('\nAll backend lint and test checks passed.');
}
