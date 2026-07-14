import postgres from "postgres";

const sql = postgres("postgresql://holocron:holocron@localhost:5432/holocron");
const rows = await sql`SELECT COUNT(*)::int AS c FROM paper_generations`;
console.log("paper_generations count:", rows[0].c);
await sql.end();
