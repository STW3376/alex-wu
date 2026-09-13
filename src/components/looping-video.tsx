"use client";

import { useEffect, useState } from "react";

export function LoopingVideo({
  src,
  poster,
  title,
}: {
  src: string;
  poster?: string;
  title: string;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <video
      className="mx-auto aspect-video max-h-[80vh] w-full bg-ink object-contain"
      src={src}
      poster={poster}
      title={title}
      muted
      loop
      playsInline
      controls
      autoPlay={!reduceMotion}
      preload={reduceMotion ? "none" : "auto"}
    >
      Your browser cannot play this video.
    </video>
  );
}
