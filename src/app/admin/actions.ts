"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCategory } from "@/content/categories";
import { getDatabaseUrl } from "@/db";
import { insertWork, slugExists } from "@/db/queries";
import type { MediaType } from "@/db/schema";
import {
  changeOwnPassword,
  clearAdminSession,
  isAdmin,
  loginWithPassword,
} from "@/lib/admin";
import { inferMediaType, isMediaRef, parseMediaUrls } from "@/lib/media";
import { slugify, uniqueSlug } from "@/lib/slug";
import { saveWorkFiles } from "@/lib/storage";

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

export async function signInStudio(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  return loginWithPassword(username, password);
}

export async function lockStudio() {
  await clearAdminSession();
  redirect("/admin");
}

export async function changeStudioPassword(
  formData: FormData,
): Promise<{ error: string } | { ok: true }> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  return changeOwnPassword(currentPassword, newPassword);
}

export async function addWork(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  if (!(await isAdmin())) {
    return { error: "The studio desk is locked." };
  }

  if (!getDatabaseUrl()) {
    return { error: "DATABASE_URL is not set, so nothing can be saved yet." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const requestedType = String(formData.get("mediaType") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const sortRaw = String(formData.get("sortOrder") ?? "").trim();
  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const pasted = parseMediaUrls(String(formData.get("mediaUrls") ?? ""));
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!title) {
    return { error: "A title is required." };
  }
  if (!isCategory(category)) {
    return { error: "Pick a studio room." };
  }
  if (pasted.some((url) => !isMediaRef(url))) {
    return { error: "Links need to start with http, https, or /." };
  }

  let uploaded: string[] = [];
  try {
    uploaded = await saveWorkFiles(files);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The files could not be saved.",
    };
  }

  const urls = [...uploaded, ...pasted];
  if (urls.length === 0) {
    return { error: "Add a file, or paste a link in Advanced." };
  }

  const mediaType = isMediaType(requestedType)
    ? requestedType
    : inferMediaType(urls);

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
