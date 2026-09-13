import Link from "next/link";
import { categoryBySlug } from "@/content/categories";
import { workAlt, workSubtitle } from "@/content/catalog";
import type { Work } from "@/db/schema";
import { posterSrc } from "@/lib/media";

export function WorkCard({
  work,
  featured = false,
  variant = "paper",
}: {
  work: Work;
  featured?: boolean;
  variant?: "paper" | "photo" | "time";
}) {
  const category = categoryBySlug[work.category];
  const poster = posterSrc(work.mediaUrls);
  const aspect =
    variant === "photo"
      ? "aspect-[3/2]"
      : variant === "time"
        ? "aspect-video"
        : featured
          ? "aspect-[4/5] sm:aspect-[3/4]"
          : "aspect-[4/5]";

  return (
    <article>
      <Link href={`/work/${work.slug}`} className="group block">
        <div className={`relative overflow-hidden bg-paper-deep ${aspect}`}>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={workAlt(work)}
              className={`h-full w-full ${
                variant === "photo" ? "object-cover" : "object-cover"
              }`}
            />
          ) : (
            <div className="flex h-full items-end p-4">
              <p className="font-display text-3xl text-ink/70">
                {work.mediaType === "audio" ? "Listen" : "Play"}
              </p>
            </div>
          )}
        </div>
        <h2 className="font-display mt-3 text-2xl leading-none group-hover:text-gold">
          {work.title}
        </h2>
        {workSubtitle(work.slug) ? (
          <p className="mt-1 text-sm text-ink-soft">{workSubtitle(work.slug)}</p>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">
            {category.label}
            {work.year ? ` · ${work.year}` : ""}
          </p>
        )}
      </Link>
    </article>
  );
}
