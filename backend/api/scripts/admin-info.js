const { Pool } = require('pg');
require('dotenv/config');

if (!process.env.DATABASE_URL) {
  console.error('Missing required environment variable: DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const { rows } = await pool.query(
    `SELECT "email", "role" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "email"`,
  );

  if (!rows.length) {
    console.error('Admin user not found');
    process.exitCode = 1;
    return;
  }

  console.log(rows.length === 1 ? 'Admin user found' : `${rows.length} admin users found`);
  for (const admin of rows) {
    console.log(`\nEmail:\n${admin.email}\n\nRole:\n${admin.role}`);
  }
}

main()
  .catch((error) => {
    console.error('Unable to read admin account:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
