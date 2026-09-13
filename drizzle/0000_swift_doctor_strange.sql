CREATE TYPE "public"."category" AS ENUM('drawings', 'animations', 'music', 'comics', 'inventions', 'crafts');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'images', 'video', 'video_embed', 'audio');--> statement-breakpoint
CREATE TABLE "works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"category" "category" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"year" integer,
	"media_type" "media_type" NOT NULL,
	"media_urls" text[] DEFAULT '{}' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "works_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "works_category_idx" ON "works" USING btree ("category");--> statement-breakpoint
CREATE INDEX "works_sort_idx" ON "works" USING btree ("sort_order","created_at");