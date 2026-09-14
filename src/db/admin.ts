import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { adminUsers, type AdminUser } from "./schema";

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function getAdminUserByUsername(username: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);
    return user ?? null;
  } catch (error) {
    console.error("Failed to load admin user", error);
    return null;
  }
}

export async function upsertAdminPassword(
  username: string,
  passwordHash: string,
) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const now = new Date();
  const [saved] = await db
    .insert(adminUsers)
    .values({
      username,
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: adminUsers.username,
      set: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: now,
      },
    })
    .returning();

  return saved;
}

export async function updateAdminPassword(userId: string, passwordHash: string) {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const [saved] = await db
    .update(adminUsers)
    .set({
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, userId))
    .returning();

  return saved;
}

export function isLocked(user: AdminUser) {
  return Boolean(user.lockedUntil && user.lockedUntil.getTime() > Date.now());
}

export async function recordFailedLogin(user: AdminUser) {
  const db = getDb();
  if (!db) {
    return;
  }

  const attempts = user.failedAttempts + 1;
  try {
    await db
      .update(adminUsers)
      .set({
        failedAttempts: attempts,
        lockedUntil:
          attempts >= MAX_FAILURES
            ? new Date(Date.now() + LOCKOUT_MS)
            : user.lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, user.id));
  } catch (error) {
    console.error("Failed to record admin login attempt", error);
  }
}

export async function clearFailedLogins(user: AdminUser) {
  const db = getDb();
  if (!db) {
    return;
  }

  try {
    await db
      .update(adminUsers)
      .set({
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, user.id));
  } catch (error) {
    console.error("Failed to clear admin login attempts", error);
  }
}
