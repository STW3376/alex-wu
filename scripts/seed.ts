import { config } from "dotenv";
import { catalogWorks } from "../src/content/catalog";
import { getDb } from "../src/db";
import { upsertWorkBySlug } from "../src/db/queries";

config({ path: ".env.local" });
config({ path: ".env" });

async function seed() {
  const db = getDb();
  if (!db) {
    console.log("No DATABASE_URL set. Skipping seed.");
    process.exit(0);
  }

  for (const work of catalogWorks) {
    const { credit, ...values } = work;
    void credit;
    await upsertWorkBySlug(values);
    console.log(`Seeded ${work.title}`);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
