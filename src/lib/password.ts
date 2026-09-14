import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LEN = 32;
const SALT_LEN = 16;
const N = 16384;
const R = 8;
const P = 1;
const MAX_MEM = 64 * 1024 * 1024;
const PREFIX = "scrypt";

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

type ParsedHash = {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
};

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derived) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derived);
    });
  });
}

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) {
    return null;
  }

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return null;
  }
  if (n < 2 || r < 1 || p < 1) {
    return null;
  }

  try {
    const salt = Buffer.from(parts[4], "base64url");
    const hash = Buffer.from(parts[5], "base64url");
    if (salt.length < 8 || hash.length < 16) {
      return null;
    }
    return { N: n, r, p, salt, hash };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LEN);
  const derived = await scryptAsync(password, salt, KEY_LEN, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  });
  return `${PREFIX}$${N}$${R}$${P}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const parsed = parseHash(storedHash);
  const salt = parsed?.salt ?? Buffer.alloc(SALT_LEN);
  const expected = parsed?.hash ?? Buffer.alloc(KEY_LEN);
  const derived = await scryptAsync(password, salt, expected.length, {
    N: parsed?.N ?? N,
    r: parsed?.r ?? R,
    p: parsed?.p ?? P,
    maxmem: MAX_MEM,
  });

  if (derived.length !== expected.length) {
    return false;
  }

  const match = timingSafeEqual(derived, expected);
  return Boolean(parsed) && match;
}

let dummyHashPromise: Promise<string> | undefined;

function dummyHash() {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString("base64url"));
  return dummyHashPromise;
}

export async function dummyVerify(password: string) {
  const hash = await dummyHash();
  await verifyPassword(password || "x", hash);
}
