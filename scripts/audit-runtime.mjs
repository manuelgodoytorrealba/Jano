import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const acceptedCliOnlyVulnerabilities = new Map([
  ['prisma', '/app/node_modules/prisma'],
  ['@prisma/config', '/app/node_modules/@prisma/config'],
  ['deepmerge-ts', '/app/node_modules/deepmerge-ts'],
  ['mysql2', '/app/node_modules/mysql2'],
]);

const audit = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  cwd: new URL('..', import.meta.url),
  encoding: 'utf8',
});

if (audit.error) {
  throw audit.error;
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error(audit.stderr || audit.stdout);
  throw new Error('npm audit did not return valid JSON');
}

const severe = Object.entries(report.vulnerabilities ?? {}).filter(([, vulnerability]) =>
  ['high', 'critical'].includes(vulnerability.severity),
);

if (report.error || audit.status === null || audit.status > 1) {
  console.error(report.error?.summary ?? audit.stderr ?? 'npm audit failed');
  process.exit(1);
}

const unexpected = severe.filter(([name]) => !acceptedCliOnlyVulnerabilities.has(name));

if (unexpected.length > 0) {
  console.error(
    `Unaccepted high/critical runtime vulnerabilities: ${unexpected
      .map(([name, vulnerability]) => `${name} (${vulnerability.severity})`)
      .join(', ')}`,
  );
  process.exitCode = 1;
} else if (severe.length === 0) {
  console.log('Runtime dependency audit passed with no high or critical vulnerabilities.');
} else {
  const dockerfile = readFileSync(new URL('../backend/api/Dockerfile', import.meta.url), 'utf8');
  const shippedExceptions = [];

  for (const [name] of severe) {
    const excludedPath = acceptedCliOnlyVulnerabilities.get(name);
    if (!dockerfile.includes(excludedPath)) {
      shippedExceptions.push([name]);
    }
  }

  if (shippedExceptions.length > 0) {
    console.error(
      `Accepted CLI-only packages are no longer excluded from the runtime image: ${shippedExceptions
        .map(([name]) => name)
        .join(', ')}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Accepted ${severe.length} Prisma CLI-only advisories; all affected packages are explicitly removed from the runtime image.`,
    );
  }
}
