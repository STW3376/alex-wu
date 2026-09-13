import type { Work } from "@/db/schema";
import { embedSrc, posterSrc, videoSrc } from "@/lib/media";
import { ComicReader } from "./comic-reader";
import { LoopingVideo } from "./looping-video";

export function WorkMedia({ work }: { work: Work }) {
  const urls = work.mediaUrls.filter(Boolean);

  if (urls.length === 0) {
    return (
      <div className="paper-card hairline px-6 py-16 text-center text-ink-soft">
        Media will appear here once a file or link is added.
      </div>
    );
  }

  if (work.mediaType === "audio") {
    return (
      <div className="paper-card hairline space-y-4 p-6">
        <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-ink-soft uppercase">
          Play
        </p>
        <ul className="space-y-4">
          {urls.map((url, index) => (
            <li key={url}>
              <p className="mb-2 text-sm text-ink-soft">
                {urls.length > 1 ? `Track ${index + 1}` : "Audio"}
              </p>
              <audio
                controls
                preload="metadata"
                src={url}
                className="w-full"
              >
                Your browser cannot play this audio.
              </audio>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (work.mediaType === "video" || work.mediaType === "video_embed") {
    if (work.mediaType === "video_embed") {
      return (
        <div className="paper-card hairline overflow-hidden">
          <div className="relative aspect-video bg-ink">
            <iframe
              src={embedSrc(urls[0])}
              title={work.title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );
    }

    return (
      <div className="paper-card hairline overflow-hidden bg-ink">
        <LoopingVideo
          src={videoSrc(urls)}
          poster={posterSrc(urls)}
          title={work.title}
        />
      </div>
    );
  }

  if (work.mediaType === "images" || urls.length > 1) {
    return <ComicReader title={work.title} pages={urls} />;
  }

  return (
    <figure className="paper-card hairline overflow-hidden bg-paper-deep">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[0]}
        alt={work.title}
        className="mx-auto max-h-[80vh] w-full object-contain"
      />
    </figure>
  );
}
