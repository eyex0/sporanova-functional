import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const client = postgres(url, { prepare: false });
  try {
    const tables = await client`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log(`Found ${tables.length} tables in public schema:`);
    for (const row of tables) {
      console.log(`  - ${row.table_name}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Check failed:", error);
  process.exit(1);
});
