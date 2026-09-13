import Link from "next/link";
import { categoryBySlug } from "@/content/categories";
import type { Work } from "@/db/schema";

export function WorkCard({ work }: { work: Work }) {
  const category = categoryBySlug[work.category];
  const preview = work.mediaUrls[0];
  const showImage =
    preview && (work.mediaType === "image" || work.mediaType === "images");

  return (
    <article>
      <Link
        href={`/work/${work.slug}`}
        className="paper-card hairline group block overflow-hidden transition-transform motion-safe:hover:-translate-y-0.5"
      >
        <div className="relative aspect-[4/3] bg-paper-deep">
          {showImage ? (
            // User-supplied remote URLs can come from any host.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={work.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-end p-5">
              <p className="font-display text-2xl leading-none text-ink/70">
                {work.mediaType === "audio"
                  ? "Listen"
                  : work.mediaType === "video" || work.mediaType === "video_embed"
                    ? "Play"
                    : "Open"}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2 px-5 py-4">
          <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-ink-soft uppercase">
            {category.label}
            {work.year ? ` · ${work.year}` : ""}
          </p>
          <h2 className="font-display text-2xl leading-tight group-hover:underline">
            {work.title}
          </h2>
          {work.description ? (
            <p className="line-clamp-2 text-sm text-ink-soft">{work.description}</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
