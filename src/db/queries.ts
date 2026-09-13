import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { type Category, type NewWork, works } from "./schema";

export async function listWorks() {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    return await db
      .select()
      .from(works)
      .orderBy(asc(works.sortOrder), desc(works.createdAt));
  } catch (error) {
    console.error("Failed to list works", error);
    return [];
  }
}

export async function listWorksByCategory(category: Category) {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    return await db
      .select()
      .from(works)
      .where(eq(works.category, category))
      .orderBy(asc(works.sortOrder), desc(works.createdAt));
  } catch (error) {
    console.error("Failed to list works by category", error);
    return [];
  }
}

export async function getWorkBySlug(slug: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [work] = await db
      .select()
      .from(works)
      .where(eq(works.slug, slug))
      .limit(1);
    return work ?? null;
  } catch (error) {
    console.error("Failed to load work", error);
    return null;
  }
}

export async function countWorksByCategory() {
  const items = await listWorks();
  return items.reduce<Record<Category, number>>(
    (counts, work) => {
      counts[work.category] += 1;
      return counts;
    },
    {
      drawings: 0,
      animations: 0,
      music: 0,
      comics: 0,
      inventions: 0,
      crafts: 0,
    },
  );
}

export async function slugExists(slug: string) {
  const existing = await getWorkBySlug(slug);
  return Boolean(existing);
}

export async function insertWork(values: NewWork) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const [created] = await db.insert(works).values(values).returning();
  return created;
}
