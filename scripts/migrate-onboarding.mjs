import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

async function main() {
  try {
    await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS "onboardingCompleted" boolean NOT NULL DEFAULT false`;
    console.log("OK: onboardingCompleted");
    await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS "onboardingStep" integer NOT NULL DEFAULT 0`;
    console.log("OK: onboardingStep");
    await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS "onboardingData" jsonb`;
    console.log("OK: onboardingData");
  } catch (e) {
    console.error("Migration error:", e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
