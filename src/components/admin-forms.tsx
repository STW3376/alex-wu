"use client";

import { upload } from "@vercel/blob/client";
import { useActionState, useState } from "react";
import { addWork, lockStudio, unlockStudio } from "@/app/admin/actions";
import { categories } from "@/content/categories";
import { parseMediaUrls } from "@/lib/media";

type ActionState = { error?: string } | void;

const initialState: ActionState = undefined;

export function UnlockForm() {
  const [state, action, pending] = useActionState(
    async (_state: ActionState, formData: FormData) => unlockStudio(formData),
    initialState,
  );

  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <label className="block space-y-2">
        <span className="text-sm">Studio secret</span>
        <input
          type="password"
          name="secret"
          autoComplete="current-password"
          required
          className="w-full border border-rule bg-paper px-3 py-2"
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-clay" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ink px-4 py-2 text-paper disabled:opacity-60"
      >
        {pending ? "Checking…" : "Unlock the desk"}
      </button>
    </form>
  );
}

export function AddWorkForm({ blobReady }: { blobReady: boolean }) {
  const [advanced, setAdvanced] = useState(false);
  const [state, action, pending] = useActionState(
    async (_state: ActionState, formData: FormData) => {
      const files = formData
        .getAll("files")
        .filter((value): value is File => value instanceof File && value.size > 0);
      const urls = parseMediaUrls(String(formData.get("mediaUrls") ?? ""));

      if (blobReady && files.length > 0) {
        try {
          for (const file of files) {
            const blob = await upload(`works/${file.name}`, file, {
              access: "public",
              handleUploadUrl: "/api/admin/upload",
            });
            urls.push(blob.url);
          }
          formData.set("mediaUrls", urls.join("\n"));
          formData.delete("files");
        } catch {
          // Fall through and let the server action store the files.
        }
      }

      return addWork(formData);
    },
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm">Title</span>
        <input
          name="title"
          required
          className="w-full border border-rule bg-paper px-3 py-2"
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm">Room</span>
          <select
            name="category"
            required
            className="w-full border border-rule bg-paper px-3 py-2"
            defaultValue="drawings"
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm">Year (optional)</span>
          <input
            name="year"
            inputMode="numeric"
            className="w-full border border-rule bg-paper px-3 py-2"
          />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-sm">Short description (optional)</span>
        <textarea
          name="description"
          rows={3}
          className="w-full border border-rule bg-paper px-3 py-2"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm">Files</span>
        <input
          name="files"
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="w-full border border-dashed border-rule bg-paper px-3 py-3"
        />
        <span className="block text-sm text-ink-soft">
          Images, video, or audio. Comics: several images, one per page.
          {blobReady
            ? " Files go to Vercel Blob, then onto the wall."
            : " Locally, files are saved under public/uploads. On Vercel, add BLOB_READ_WRITE_TOKEN."}
        </span>
      </label>
      <button
        type="button"
        onClick={() => setAdvanced((open) => !open)}
        className="text-sm text-ink-soft underline-offset-4 hover:underline"
      >
        {advanced ? "Hide advanced" : "Advanced: paste a URL"}
      </button>
      {advanced ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2 sm:col-span-2">
            <span className="text-sm">Media links</span>
            <textarea
              name="mediaUrls"
              rows={4}
              className="w-full border border-rule bg-paper px-3 py-2"
              placeholder="https://… one link per line"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm">Media type</span>
            <select
              name="mediaType"
              className="w-full border border-rule bg-paper px-3 py-2"
              defaultValue=""
            >
              <option value="">Guess from the files</option>
              <option value="image">One image</option>
              <option value="images">Several images / comic pages</option>
              <option value="video">Video file</option>
              <option value="video_embed">YouTube or Vimeo</option>
              <option value="audio">Audio</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm">Sort order</span>
            <input
              name="sortOrder"
              type="number"
              defaultValue={0}
              className="w-full border border-rule bg-paper px-3 py-2"
            />
          </label>
          <label className="block space-y-2 sm:col-span-2">
            <span className="text-sm">Slug (optional)</span>
            <input
              name="slug"
              className="w-full border border-rule bg-paper px-3 py-2"
              placeholder="auto from the title"
            />
          </label>
        </div>
      ) : null}
      {state?.error ? (
        <p className="text-sm text-clay" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-4 py-2 text-paper disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add this work"}
        </button>
        <button
          type="submit"
          formAction={lockStudio}
          className="border border-rule px-4 py-2"
        >
          Lock the desk
        </button>
      </div>
    </form>
  );
}
