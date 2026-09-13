import { config } from "dotenv";
import { getDb } from "../src/db";
import { works } from "../src/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function seed() {
  const db = getDb();
  if (!db) {
    console.log("No DATABASE_URL set. Skipping seed.");
    process.exit(0);
  }

  const existing = await db.select({ id: works.id }).from(works).limit(1);
  if (existing.length > 0) {
    console.log("Works already exist. Seed inserts nothing.");
    return;
  }

  // Intentionally insert zero artworks. Real pieces get added from /admin.
  console.log("Seed complete. The works table is empty and ready for real pieces.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
