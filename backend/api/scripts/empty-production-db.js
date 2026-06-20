const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
require('dotenv/config');

const confirm = process.env.CONFIRM_EMPTY_DB;
const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME || 'Admin';
const adminRole = process.env.ADMIN_ROLE || 'ADMIN';
const adminIsBeta = process.env.ADMIN_IS_BETA || 'false';

if (!databaseUrl) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

if (confirm !== 'YES') {
  console.error('Refusing to run. Set CONFIRM_EMPTY_DB=YES to empty the database.');
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

function maskDatabaseUrl(value) {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    return value.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
  }
}

async function main() {
  const client = await pool.connect();

  try {
    const info = await client.query('select current_database() as database, current_user as username, inet_server_addr()::text as host, inet_server_port()::text as port');
    const target = info.rows[0];

    console.log('WARNING: this will delete all data in the public schema except _prisma_migrations.');
    console.log(`Target: ${maskDatabaseUrl(databaseUrl)}`);
    console.log(`Connected to: ${target.database} on ${target.host}:${target.port} as ${target.username}`);

    await client.query('BEGIN');
    await client.query(`
      DO $$
      DECLARE stmt text;
      BEGIN
        SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' RESTART IDENTITY CASCADE'
        INTO stmt
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations';

        IF stmt IS NULL THEN
          RAISE NOTICE 'No public tables to truncate';
          RETURN;
        END IF;

        EXECUTE stmt;
      END $$;
    `);

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `
        INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "isBeta", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [randomUUID(), adminEmail.trim().toLowerCase(), passwordHash, adminName, adminRole, adminIsBeta === 'true'],
    );

    await client.query('COMMIT');
    console.log('Database emptied and admin user created.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
