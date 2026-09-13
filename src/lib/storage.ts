import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
}

export async function saveWorkFiles(files: File[]) {
  const urls: string[] = [];

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) {
      continue;
    }

    if (blobConfigured()) {
      const blob = await put(`works/${file.name}`, file, {
        access: "public",
        addRandomSuffix: true,
      });
      urls.push(blob.url);
      continue;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Set BLOB_READ_WRITE_TOKEN so files can be stored on Vercel Blob.",
      );
    }

    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    const filename = `${Date.now()}-${safeFileName(file.name)}`;
    await writeFile(
      path.join(directory, filename),
      Buffer.from(await file.arrayBuffer()),
    );
    urls.push(`/uploads/${filename}`);
  }

  return urls;
}
