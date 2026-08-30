import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const run = (compiledFile: string, sourceFile: string) => {
  if (existsSync(compiledFile)) {
    execFileSync('node', [compiledFile], { stdio: 'inherit', env: process.env });
    return;
  }

  execFileSync('node', ['-r', 'ts-node/register', sourceFile], {
    stdio: 'inherit',
    env: process.env,
  });
};

run('dist/prisma/seed-system.js', 'prisma/seed-system.ts');
run('dist/prisma/seed-foundational.js', 'prisma/seed-foundational.ts');
