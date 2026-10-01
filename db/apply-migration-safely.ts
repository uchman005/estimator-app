// Applies one drizzle migration file directly, bypassing drizzle-orm's
// migrate() runner — see the "A migration that tightens a column to
// NOT NULL..." note in README.md for why: drizzle wraps every pending
// migration in one transaction, PRAGMA foreign_keys=OFF is a documented
// no-op while a transaction is open, and a table-rebuild migration run
// with foreign_keys genuinely still on can silently cascade-delete rows
// in tables the migration file never mentions.
//
// Usage: npx tsx db/apply-migration-safely.ts <tag> <whenMillis>
// <tag> matches a drizzle/meta/_journal.json entry's "tag"; <whenMillis>
// matches that same entry's "when" (both must match exactly, or a future
// `npm run db:migrate` will disagree with this script about what's applied).
import Database from "better-sqlite3";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

const [, , tag, whenArg] = process.argv;
if (!tag || !whenArg) {
  console.error("Usage: npx tsx db/apply-migration-safely.ts <tag> <whenMillis>");
  process.exit(1);
}
const WHEN = Number(whenArg);

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "sqlite.db");
const migrationPath = path.join(process.cwd(), "drizzle", `${tag}.sql`);

function main() {
  const query = fs.readFileSync(migrationPath, "utf8");
  // Strip every embedded PRAGMA foreign_keys statement and control it
  // ourselves, once, for the file's whole execution — a file with more than
  // one table rebuild re-enables it mid-file otherwise.
  const statements = query
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s && !/^PRAGMA foreign_keys\s*=/i.test(s));
  const hash = createHash("sha256").update(query).digest("hex");

  const db = new Database(dbPath);
  const [already] = db.prepare(`SELECT id FROM __drizzle_migrations WHERE hash = ?`).all(hash) as { id: number }[];
  if (already) {
    console.log(`Migration ${tag} already recorded — nothing to do.`);
    db.close();
    return;
  }

  db.pragma("foreign_keys = OFF"); // genuinely takes effect: no transaction open yet
  for (const stmt of statements) db.exec(stmt);
  db.pragma("foreign_keys = ON");

  db.prepare(`INSERT INTO __drizzle_migrations ("hash", "created_at") VALUES (?, ?)`).run(hash, WHEN);
  console.log(`Applied ${tag} and recorded it in __drizzle_migrations.`);
  db.close();
}

main();
