import { execFileSync } from 'node:child_process';

if (!['development', 'test'].includes(process.env.NODE_ENV ?? 'development')) {
  throw new Error('db:reset:development only runs with NODE_ENV=development or test.');
}
execFileSync('npx', ['prisma', 'migrate', 'reset', '--force'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' },
});
for (const file of [
  'prisma/cleanup-development-demo.ts',
  'prisma/seed-system.ts',
  'prisma/seed-foundational.ts',
]) {
  execFileSync('node', ['-r', 'ts-node/register', file], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' },
  });
}
