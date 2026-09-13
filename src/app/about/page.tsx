import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description: site.about,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 sm:px-8">
      <h1 className="font-display text-6xl">{site.name}</h1>
      <div className="mt-8 space-y-4 text-lg leading-relaxed text-ink-soft">
        <p>{site.about}</p>
        <p>{site.contact}</p>
      </div>
    </div>
  );
}
