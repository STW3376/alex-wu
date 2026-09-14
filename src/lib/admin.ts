import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearFailedLogins,
  getAdminUserByUsername,
  isLocked,
  recordFailedLogin,
  updateAdminPassword,
} from "@/db/admin";
import { getDatabaseUrl } from "@/db";
import { isAdminUsername } from "@/lib/admin-usernames";
import {
  dummyVerify,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "@/lib/password";
import { consumeLoginRateLimit } from "@/lib/rate-limit";
import {
  clearAdminSession,
  getAdminSession,
  sessionConfigured,
  setAdminSession,
} from "@/lib/session";

const GENERIC_LOGIN_ERROR = "Sign-in did not work.";

export { clearAdminSession, getAdminSession, setAdminSession };

export function deskConfigured() {
  return Boolean(getDatabaseUrl()) && sessionConfigured();
}

export async function isAdmin() {
  return Boolean(await getAdminSession());
}

async function clientIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerList.get("x-real-ip")?.trim() || "unknown";
}

export async function loginWithPassword(
  usernameRaw: string,
  password: string,
): Promise<{ error: string } | undefined> {
  if (!deskConfigured()) {
    return { error: "The studio desk is not configured yet." };
  }

  const ip = await clientIp();
  if (!consumeLoginRateLimit(ip)) {
    await dummyVerify(password);
    return { error: GENERIC_LOGIN_ERROR };
  }

  const username = usernameRaw.trim().toLowerCase();
  if (
    !isAdminUsername(username) ||
    !password ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    await dummyVerify(password || "x");
    return { error: GENERIC_LOGIN_ERROR };
  }

  const user = await getAdminUserByUsername(username);
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await dummyVerify(password).then(() => false);
  const locked = user ? isLocked(user) : false;

  if (!user || locked || !passwordOk) {
    if (user && !locked && !passwordOk) {
      await recordFailedLogin(user);
    }
    return { error: GENERIC_LOGIN_ERROR };
  }

  await clearFailedLogins(user);
  await setAdminSession(username);
  redirect("/admin");
}

export async function changeOwnPassword(
  currentPassword: string,
  nextPassword: string,
) {
  const session = await getAdminSession();
  if (!session) {
    return { error: "The studio desk is locked." };
  }

  if (
    nextPassword.length < MIN_PASSWORD_LENGTH ||
    nextPassword.length > MAX_PASSWORD_LENGTH
  ) {
    return {
      error: `New password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    };
  }

  if (currentPassword === nextPassword) {
    return { error: "Pick a new password that is different from the current one." };
  }

  const user = await getAdminUserByUsername(session.username);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "The current password did not match." };
  }

  await updateAdminPassword(user.id, await hashPassword(nextPassword));
  await setAdminSession(session.username);
  return { ok: true as const };
}
