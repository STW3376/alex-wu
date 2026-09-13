import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description: site.about,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-[0.72rem] font-semibold tracking-[0.28em] text-ink-soft uppercase">
        About the studio
      </p>
      <h1 className="font-display mt-3 text-5xl leading-none">{site.name}</h1>
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-soft">
        <p>{site.about}</p>
        <p>{site.intro}</p>
        <p>{site.contact}</p>
      </div>
    </div>
  );
}
