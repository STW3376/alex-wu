"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCategory } from "@/content/categories";
import { getDatabaseUrl } from "@/db";
import { insertWork, slugExists } from "@/db/queries";
import type { MediaType } from "@/db/schema";
import {
  adminConfigured,
  clearAdminSession,
  setAdminSession,
  verifyAdminSecret,
  isAdmin,
} from "@/lib/admin";
import { isHttpUrl, parseMediaUrls } from "@/lib/media";
import { slugify, uniqueSlug } from "@/lib/slug";

const mediaTypes: MediaType[] = [
  "image",
  "images",
  "video",
  "video_embed",
  "audio",
];

function isMediaType(value: string): value is MediaType {
  return mediaTypes.includes(value as MediaType);
}

export async function unlockStudio(formData: FormData) {
  if (!adminConfigured()) {
    return { error: "ADMIN_SECRET is not set on this deployment." };
  }

  const secret = String(formData.get("secret") ?? "");
  if (!verifyAdminSecret(secret)) {
    return { error: "That secret did not match." };
  }

  await setAdminSession();
  redirect("/admin");
}

export async function lockStudio() {
  await clearAdminSession();
  redirect("/admin");
}

export async function addWork(formData: FormData) {
  if (!(await isAdmin())) {
    return { error: "The studio desk is locked." };
  }

  if (!getDatabaseUrl()) {
    return { error: "DATABASE_URL is not set, so nothing can be saved yet." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const mediaType = String(formData.get("mediaType") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const sortRaw = String(formData.get("sortOrder") ?? "").trim();
  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const urls = parseMediaUrls(String(formData.get("mediaUrls") ?? ""));

  if (!title) {
    return { error: "A title is required." };
  }
  if (!isCategory(category)) {
    return { error: "Pick a studio room." };
  }
  if (!isMediaType(mediaType)) {
    return { error: "Pick a media type." };
  }
  if (urls.some((url) => !isHttpUrl(url))) {
    return { error: "Every media line needs to be an http or https link." };
  }

  let year: number | null = null;
  if (yearRaw) {
    year = Number(yearRaw);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return { error: "Year should be a whole number, or left blank." };
    }
  }

  const sortOrder = sortRaw ? Number(sortRaw) : 0;
  if (!Number.isInteger(sortOrder)) {
    return { error: "Sort order should be a whole number." };
  }

  const slug = await uniqueSlug(slugify(requestedSlug || title), slugExists);

  const work = await insertWork({
    title,
    slug,
    category,
    description: description || null,
    year,
    mediaType,
    mediaUrls: urls,
    sortOrder,
  });

  revalidatePath("/");
  revalidatePath(`/${category}`);
  revalidatePath(`/work/${work.slug}`);
  redirect(`/work/${work.slug}`);
}
