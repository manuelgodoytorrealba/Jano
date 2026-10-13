import { Pool } from 'pg';
import 'dotenv/config';

type QueryStat = {
  queryid: string;
  calls: string;
  total_exec_time: number;
  mean_exec_time: number;
  rows: string;
  query: string;
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query<QueryStat>(`
    SELECT
      queryid::text,
      calls::text,
      round(total_exec_time::numeric, 2)::float8 AS total_exec_time,
      round(mean_exec_time::numeric, 2)::float8 AS mean_exec_time,
      rows::text,
      left(regexp_replace(query, '[[:space:]]+', ' ', 'g'), 500) AS query
    FROM pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      AND userid = (SELECT usesysid FROM pg_user WHERE usename = current_user)
    ORDER BY total_exec_time DESC
    LIMIT 25
  `);

  process.stdout.write(
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        database: new URL(process.env.DATABASE_URL!).pathname.replace(/^\//, ''),
        order: 'total_exec_time_desc',
        statements: result.rows.map((row) => ({
          queryId: row.queryid,
          calls: Number(row.calls),
          totalMs: row.total_exec_time,
          meanMs: row.mean_exec_time,
          rows: Number(row.rows),
          query: row.query,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
