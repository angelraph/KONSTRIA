import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const [, , sqlFilePath] = process.argv;
if (!sqlFilePath) {
  console.error("Usage: node run-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(connectionString);
const fullScript = readFileSync(sqlFilePath, "utf-8");

const withoutComments = fullScript
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

const statements = withoutComments
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Found ${statements.length} statements to run.`);

for (const [i, stmt] of statements.entries()) {
  try {
    await sql.query(stmt);
    console.log(`[${i + 1}/${statements.length}] OK: ${stmt.slice(0, 60).replace(/\n/g, " ")}...`);
  } catch (err) {
    console.error(`[${i + 1}/${statements.length}] FAILED: ${stmt.slice(0, 100)}`);
    console.error(err.message);
    process.exit(1);
  }
}

console.log("Migration complete.");
