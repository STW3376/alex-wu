import type { NewWork } from "@/db/schema";

export const featuredSlug = "the-entire-observable-seal";

type CatalogWork = NewWork & {
  credit?: string;
  subtitle?: string;
  alt?: string;
};

export const catalogWorks = [
  {
    slug: featuredSlug,
    title: "The Entire Observable Seal",
    category: "animations",
    year: 2026,
    description:
      "I wanted to zoom out to show how huge the universe is, from a tiny bug all the way to a giant spinning galaxy. But it turns out the biggest thing of all is just a really round seal!",
    mediaType: "video",
    mediaUrls: [
      "/works/the-entire-observable-seal.mp4",
      "/works/the-entire-observable-seal-poster.jpg",
    ],
    sortOrder: 0,
    credit: "7.5 seconds · silent · 1280×720 · 12 fps",
  },
  {
    slug: "the-wizard",
    title: "The Wizard",
    category: "drawings",
    year: null,
    description: "Crayon and colored pencil on white paper.",
    mediaType: "image",
    mediaUrls: ["/works/wizard.jpg"],
    sortOrder: 1,
    alt: "The Wizard — a small figure in a pink pointed hat, holding a staff with a yellow sun-like orb",
  },
  {
    slug: "golden-lute",
    title: "Golden Lute",
    category: "drawings",
    year: null,
    description:
      "Ink and color. A golden lute with a red 吉 emblem, mountains, and spotted seals — a motif that also appears in The Entire Observable Seal.",
    mediaType: "image",
    mediaUrls: ["/works/golden-lute.jpg"],
    sortOrder: 2,
    alt: "Golden Lute — a huge golden gourd-shaped string instrument beside mountains, a crescent moon, and spotted seals",
  },
  {
    slug: "ancestor-bird",
    title: "祖",
    category: "drawings",
    year: null,
    description: "Ink and blue pencil on kraft paper.",
    mediaType: "image",
    mediaUrls: ["/works/ancestor-bird.jpg"],
    sortOrder: 3,
    subtitle: "Ancestor bird",
    alt: "祖, Ancestor bird — a compact blue-headed bird facing right, with the character 祖 at lower left",
  },
] satisfies CatalogWork[];

export function catalogEntry(slug: string) {
  return catalogWorks.find((work) => work.slug === slug);
}

export function workCredit(slug: string) {
  return catalogEntry(slug)?.credit;
}

export function workSubtitle(slug: string) {
  return catalogEntry(slug)?.subtitle;
}

export function workAlt(work: { slug: string; title: string }) {
  return catalogEntry(work.slug)?.alt ?? work.title;
}
