import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "aw_studio";
const MAX_AGE = 60 * 60 * 24 * 14;

function secret() {
  return process.env.ADMIN_SECRET?.trim() || "";
}

export function adminConfigured() {
  return secret().length > 0;
}

export function sessionToken() {
  const value = secret();
  if (!value) {
    return "";
  }
  return createHash("sha256").update(`alex-wu-studio:${value}`).digest("hex");
}

export function verifyAdminSecret(candidate: string) {
  const expected = secret();
  if (!expected || !candidate) {
    return false;
  }

  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export async function isAdmin() {
  const expected = sessionToken();
  if (!expected) {
    return false;
  }

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }

  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
