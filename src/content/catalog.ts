import type { NewWork } from "@/db/schema";

export const featuredSlug = "the-entire-observable-seal";

export const catalogWorks = [
  {
    slug: featuredSlug,
    title: "The Entire Observable Seal",
    category: "animations" as const,
    year: 2026,
    description:
      "I wanted to zoom out to show how huge the universe is, from a tiny bug all the way to a giant spinning galaxy. But it turns out the biggest thing of all is just a really round seal!",
    mediaType: "video" as const,
    mediaUrls: [
      "/works/the-entire-observable-seal.mp4",
      "/works/the-entire-observable-seal-poster.jpg",
    ],
    sortOrder: 0,
    credit: "7.5 seconds · silent · 1280×720 · 12 fps",
  },
] satisfies Array<NewWork & { credit?: string }>;

export function workCredit(slug: string) {
  return catalogWorks.find((work) => work.slug === slug)?.credit;
}
