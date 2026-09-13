"use client";

import { useEffect, useState } from "react";

export function ComicReader({
  title,
  pages,
}: {
  title: string;
  pages: string[];
}) {
  const [index, setIndex] = useState(0);
  const page = pages[index];
  const last = pages.length - 1;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(last, current + 1));
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(0, current - 1));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  if (!page) {
    return null;
  }

  return (
    <div className="space-y-4">
      <figure className="paper-card hairline overflow-hidden bg-paper-deep">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page}
          alt={`${title}, page ${index + 1} of ${pages.length}`}
          className="mx-auto max-h-[80vh] w-full object-contain"
        />
      </figure>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Page {index + 1} of {pages.length}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
            className="hairline px-3 py-2 text-sm disabled:opacity-40"
          >
            Previous page
          </button>
          <button
            type="button"
            onClick={() => setIndex((current) => Math.min(last, current + 1))}
            disabled={index === last}
            className="hairline bg-ink px-3 py-2 text-sm text-paper disabled:opacity-40"
          >
            Next page
          </button>
        </div>
      </div>
    </div>
  );
}
