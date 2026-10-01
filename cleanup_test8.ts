import { db } from "./db/index";
import { users, programs, projects } from "./db/schema";
import { eq } from "drizzle-orm";

async function main() {
  await db.delete(users).where(eq(users.email, "verify-test8@example.com"));
  console.log("users:", JSON.stringify(await db.select({ id: users.id, email: users.email }).from(users)));
  console.log("programs:", JSON.stringify(await db.select({ id: programs.id, name: programs.name }).from(programs)));
  console.log("projects:", JSON.stringify(await db.select({ id: projects.id, name: projects.name }).from(projects)));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
