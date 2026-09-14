import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", [
  "drawings",
  "animations",
  "music",
  "comics",
  "inventions",
  "crafts",
  "photography",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "image",
  "images",
  "video",
  "video_embed",
  "audio",
]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const works = pgTable(
  "works",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    category: categoryEnum("category").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    year: integer("year"),
    mediaType: mediaTypeEnum("media_type").notNull(),
    mediaUrls: text("media_urls").array().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("works_category_idx").on(table.category),
    index("works_sort_idx").on(table.sortOrder, table.createdAt),
  ],
);

export type Work = typeof works.$inferSelect;
export type NewWork = typeof works.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type Category = (typeof categoryEnum.enumValues)[number];
export type MediaType = (typeof mediaTypeEnum.enumValues)[number];
