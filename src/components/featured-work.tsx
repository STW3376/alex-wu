import Link from "next/link";
import { workCredit } from "@/content/catalog";
import type { Work } from "@/db/schema";
import { posterSrc, videoSrc } from "@/lib/media";
import { LoopingVideo } from "./looping-video";

export function FeaturedWork({ work }: { work: Work }) {
  const credit = workCredit(work.slug);
  const video = videoSrc(work.mediaUrls);
  const poster = posterSrc(work.mediaUrls);

  return (
    <section aria-labelledby="featured-work" className="mt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-semibold tracking-[0.28em] text-ink-soft uppercase">
            Now on the wall
          </p>
          <h2 id="featured-work" className="font-display mt-2 text-3xl sm:text-4xl">
            {work.title}
          </h2>
        </div>
        <p className="hidden max-w-xs text-right text-sm text-ink-soft sm:block">
          A silent zoom from a tiny bug to a giant joke.
        </p>
      </div>
      <div className="paper-card hairline overflow-hidden">
        <LoopingVideo src={video} poster={poster} title={work.title} />
      </div>
      <div className="mt-5 max-w-2xl space-y-3">
        <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-ink-soft uppercase">
          Animation{work.year ? ` · ${work.year}` : ""}
          {credit ? ` · ${credit}` : ""}
        </p>
        {work.description ? (
          <p className="text-lg leading-relaxed text-ink-soft">{work.description}</p>
        ) : null}
        <Link
          href={`/work/${work.slug}`}
          className="inline-block text-sm text-ink underline-offset-4 hover:underline"
        >
          Watch The Entire Observable Seal
        </Link>
      </div>
    </section>
  );
}
