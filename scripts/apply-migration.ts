import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sqlPath = resolve(process.cwd(), "drizzle/0000_initial_postgres.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const client = postgres(url, { prepare: false });
  try {
    await client.unsafe(sql);
    console.log("Migration applied successfully");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
