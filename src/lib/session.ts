import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  type AdminUsername,
  isAdminUsername,
} from "@/lib/admin-usernames";

export const SESSION_COOKIE = "aw_desk";
export const LEGACY_COOKIE = "aw_studio";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type AdminSession = {
  username: AdminUsername;
};

function signingSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || "";
}

export function sessionConfigured() {
  return signingSecret().length >= 16;
}

function sign(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function signaturesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function setAdminSession(username: AdminUsername) {
  if (!sessionConfigured()) {
    throw new Error("ADMIN_SESSION_SECRET is not set.");
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = Buffer.from(JSON.stringify({ sub: username, exp })).toString(
    "base64url",
  );
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE));
  store.delete(LEGACY_COOKIE);
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(LEGACY_COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!sessionConfigured()) {
    return null;
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const separator = token.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!payload || !signature || !signaturesMatch(signature, sign(payload))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (typeof data.exp !== "number" || data.exp * 1000 < Date.now()) {
      return null;
    }
    if (typeof data.sub !== "string" || !isAdminUsername(data.sub)) {
      return null;
    }
    return { username: data.sub };
  } catch {
    return null;
  }
}
