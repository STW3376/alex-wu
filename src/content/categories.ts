import type { Category } from "@/db/schema";

export type CategoryMeta = {
  slug: Category;
  label: string;
  phrase: string;
  invitation: string;
  accent: "clay" | "gold" | "teal" | "indigo" | "forest" | "rose" | "seal";
  variant: "paper" | "photo" | "time";
};

export const categories: CategoryMeta[] = [
  {
    slug: "drawings",
    label: "Drawings",
    phrase: "On paper.",
    invitation: "Three drawings are on the wall.",
    accent: "gold",
    variant: "paper",
  },
  {
    slug: "animations",
    label: "Animations",
    phrase: "Pictures that move.",
    invitation: "The first film is already on the wall.",
    accent: "gold",
    variant: "time",
  },
  {
    slug: "music",
    label: "Music",
    phrase: "Songs and sounds.",
    invitation: "Listen in when a new track is ready.",
    accent: "teal",
    variant: "time",
  },
  {
    slug: "comics",
    label: "Comics",
    phrase: "Stories in panels.",
    invitation: "Flip through a comic once the pages are up.",
    accent: "indigo",
    variant: "paper",
  },
  {
    slug: "inventions",
    label: "Inventions",
    phrase: "Ideas built into things.",
    invitation: "Machines and half-wild ideas belong on this shelf.",
    accent: "forest",
    variant: "photo",
  },
  {
    slug: "crafts",
    label: "Crafts",
    phrase: "Made by hand.",
    invitation: "Handmade work will live here.",
    accent: "rose",
    variant: "photo",
  },
  {
    slug: "photography",
    label: "Photography",
    phrase: "Taken, not drawn.",
    invitation: "Photographs will live here — frames and light, not paper scans.",
    accent: "seal",
    variant: "photo",
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
  seal: "accent-seal",
};
