import { execFileSync } from 'node:child_process';

const run = (file: string) =>
  execFileSync('node', ['-r', 'ts-node/register', file], { stdio: 'inherit', env: process.env });

run('prisma/seed-system.ts');
run('prisma/seed-foundational.ts');
