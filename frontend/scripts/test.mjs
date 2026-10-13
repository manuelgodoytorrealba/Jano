import { delimiter, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const frontendRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(frontendRoot, '..');
const frontendNodeModules = resolve(frontendRoot, 'node_modules');
const existingNodePath = process.env.NODE_PATH;

const result = spawnSync(
  process.execPath,
  [
    resolve(repositoryRoot, 'node_modules/@angular/cli/bin/ng.js'),
    'test',
    ...process.argv.slice(2),
  ],
  {
    cwd: frontendRoot,
    env: {
      ...process.env,
      NODE_PATH: existingNodePath
        ? `${frontendNodeModules}${delimiter}${existingNodePath}`
        : frontendNodeModules,
    },
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
