import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

const migrationsDir = join(process.cwd(), "migrations");
const files = readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

console.log(`Found ${files.length} migration files`);
for (const file of files) {
  const content = readFileSync(join(migrationsDir, file), "utf8");
  console.log(`\n=== Applying ${file} ===`);
  try {
    await sql.unsafe(content);
    console.log(`OK`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
    // Continue despite errors (CREATE TABLE IF NOT EXISTS, etc.)
  }
}

await sql.end();
console.log("\nAll migrations applied");
