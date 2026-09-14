import { config } from "dotenv";
import { upsertAdminPassword } from "../src/db/admin";
import { getDb } from "../src/db";
import {
  ADMIN_USERNAMES,
  isAdminUsername,
  passwordEnvName,
  type AdminUsername,
} from "../src/lib/admin-usernames";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/password";

config({ path: ".env.local" });
config({ path: ".env" });

function envPassword(username: AdminUsername) {
  return process.env[passwordEnvName(username)]?.trim() || "";
}

async function setPassword(username: AdminUsername, password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password for ${username} must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  const passwordHash = await hashPassword(password);
  await upsertAdminPassword(username, passwordHash);
  console.log(`Saved hashed password for ${username}.`);
}

async function main() {
  const db = getDb();
  if (!db) {
    console.log("No DATABASE_URL set. Skipping.");
    process.exit(0);
  }

  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  if (args[0]) {
    const username = args[0].trim().toLowerCase();
    if (!isAdminUsername(username)) {
      console.error("Username must be ted or alex.");
      process.exit(1);
    }

    const password = args[1] || envPassword(username);
    if (!password) {
      console.error(
        `No password for ${username}. Set ${passwordEnvName(username)} or pass it as a CLI argument.`,
      );
      process.exit(1);
    }

    await setPassword(username, password);
    return;
  }

  let wrote = false;
  for (const username of ADMIN_USERNAMES) {
    const password = envPassword(username);
    if (!password) {
      console.log(
        `Skipping ${username}: ${passwordEnvName(username)} is not set.`,
      );
      continue;
    }
    await setPassword(username, password);
    wrote = true;
  }

  if (!wrote) {
    console.log(
      "No ADMIN_TED_PASSWORD or ADMIN_ALEX_PASSWORD set. No users created.",
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
