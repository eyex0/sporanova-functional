import { requireDb } from "./server/db";
const db = await requireDb();
const dbTables = await db.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
const dbTableNames = new Set(dbTables.map(r => r.table_name));
console.log("DB has", dbTableNames.size, "tables");
