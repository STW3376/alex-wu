"use client";

import { useActionState } from "react";
import { categories } from "@/content/categories";
import { addWork, lockStudio, unlockStudio } from "@/app/admin/actions";

type ActionState = { error?: string } | void;

const initialState: ActionState = undefined;

export function UnlockForm() {
  const [state, action, pending] = useActionState(
    async (_state: ActionState, formData: FormData) => unlockStudio(formData),
    initialState,
  );

  return (
    <form action={action} className="paper-card hairline mx-auto max-w-md space-y-4 p-6">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Studio secret</span>
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
        className="w-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
      >
        {pending ? "Checking…" : "Unlock the desk"}
      </button>
    </form>
  );
}

export function AddWorkForm() {
  const [state, action, pending] = useActionState(
    async (_state: ActionState, formData: FormData) => addWork(formData),
    initialState,
  );

  return (
    <form action={action} className="paper-card hairline space-y-5 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-medium">Title</span>
          <input
            name="title"
            required
            className="w-full border border-rule bg-paper px-3 py-2"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Room</span>
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
          <span className="text-sm font-medium">Media type</span>
          <select
            name="mediaType"
            required
            className="w-full border border-rule bg-paper px-3 py-2"
            defaultValue="image"
          >
            <option value="image">One image</option>
            <option value="images">Several images / comic pages</option>
            <option value="video">Video file</option>
            <option value="video_embed">YouTube or Vimeo link</option>
            <option value="audio">Audio</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Year (optional)</span>
          <input
            name="year"
            inputMode="numeric"
            className="w-full border border-rule bg-paper px-3 py-2"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={0}
            className="w-full border border-rule bg-paper px-3 py-2"
          />
        </label>
        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-medium">Slug (optional)</span>
          <input
            name="slug"
            className="w-full border border-rule bg-paper px-3 py-2"
            placeholder="auto from the title"
          />
        </label>
        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-medium">Short description</span>
          <textarea
            name="description"
            rows={4}
            className="w-full border border-rule bg-paper px-3 py-2"
          />
        </label>
        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-medium">Media links</span>
          <textarea
            name="mediaUrls"
            rows={5}
            className="w-full border border-rule bg-paper px-3 py-2"
            placeholder="https://… one link per line. Comics: one page per line."
          />
        </label>
      </div>
      {state?.error ? (
        <p className="text-sm text-clay" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add this work"}
        </button>
        <button
          type="submit"
          formAction={lockStudio}
          className="border border-rule px-4 py-2 text-sm"
        >
          Lock the desk
        </button>
      </div>
    </form>
  );
}
