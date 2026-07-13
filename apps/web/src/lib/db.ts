import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://holocron:holocron@localhost:5432/holocron";

let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!sql) {
    sql = postgres(connectionString, { max: 10 });
  }
  return sql;
}
