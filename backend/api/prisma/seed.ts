/**
 * Deprecated compatibility entrypoint. The development/product bootstrap is
 * intentionally split into system seed and Knowledge Core seed.
 */
console.error(
  'Deprecated seed entrypoint. Use prisma/seed-bootstrap.ts (system + foundational Knowledge Core).',
);
process.exitCode = 1;
