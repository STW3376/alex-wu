export const ADMIN_USERNAMES = ["ted", "alex"] as const;

export type AdminUsername = (typeof ADMIN_USERNAMES)[number];

export function isAdminUsername(value: string): value is AdminUsername {
  return (ADMIN_USERNAMES as readonly string[]).includes(value);
}

export function passwordEnvName(username: AdminUsername) {
  return username === "ted" ? "ADMIN_TED_PASSWORD" : "ADMIN_ALEX_PASSWORD";
}
