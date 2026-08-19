// One-off migration runner: applies supabase/migrations/*.sql in order against DATABASE_URL.
// Not part of the app's normal workflow (the documented path is `supabase db push`) — this
// exists because CLI auth wasn't available and a direct Postgres connection was.
import { readdirSync, readFileSync } from "fs";
import path from "path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Set DATABASE_URL before running this script.");
  process.exit(1);
}

const migrationsDir = path.resolve("supabase/migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log(`Connected. Applying ${files.length} migrations...\n`);

  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`-- ${file}`);
    try {
      await client.query(sql);
      console.log(`   ok\n`);
    } catch (err) {
      console.error(`   FAILED: ${err.message}\n`);
      await client.end();
      process.exit(1);
    }
  }

  console.log("All migrations applied successfully.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
