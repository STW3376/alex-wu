import type { Category } from "@/db/schema";

export type CategoryMeta = {
  slug: Category;
  label: string;
  phrase: string;
  invitation: string;
  accent: "clay" | "gold" | "teal" | "indigo" | "forest" | "rose";
};

export const categories: CategoryMeta[] = [
  {
    slug: "drawings",
    label: "Drawings",
    phrase: "Pencil, marker, and whatever was on the desk.",
    invitation: "Pages from the sketch pile — when a drawing is ready, it lands here.",
    accent: "clay",
  },
  {
    slug: "animations",
    label: "Animations",
    phrase: "Pictures that learned how to move.",
    invitation: "Short films and moving drawings will play here.",
    accent: "gold",
  },
  {
    slug: "music",
    label: "Music",
    phrase: "Songs, sounds, and experiments.",
    invitation: "Listen in when a new track is ready.",
    accent: "teal",
  },
  {
    slug: "comics",
    label: "Comics",
    phrase: "Stories told in panels.",
    invitation: "Flip through a comic once the pages are up.",
    accent: "indigo",
  },
  {
    slug: "inventions",
    label: "Inventions",
    phrase: "Ideas built into things.",
    invitation: "Machines, gadgets, and half-wild ideas belong on this shelf.",
    accent: "forest",
  },
  {
    slug: "crafts",
    label: "Crafts",
    phrase: "Made by hand, not just imagined.",
    invitation: "Paper, clay, wood, and other handmade work will live here.",
    accent: "rose",
  },
];

export const categoryBySlug = Object.fromEntries(
  categories.map((category) => [category.slug, category]),
) as Record<Category, CategoryMeta>;

export function isCategory(value: string): value is Category {
  return value in categoryBySlug;
}

export const accentClass: Record<CategoryMeta["accent"], string> = {
  clay: "accent-clay",
  gold: "accent-gold",
  teal: "accent-teal",
  indigo: "accent-indigo",
  forest: "accent-forest",
  rose: "accent-rose",
};
