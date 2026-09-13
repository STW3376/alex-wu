import Link from "next/link";
import { accentClass, type CategoryMeta } from "@/content/categories";

export function CategoryCard({ category }: { category: CategoryMeta }) {
  return (
    <Link
      href={`/${category.slug}`}
      className={`${accentClass[category.accent]} group block`}
    >
      <h2 className="font-display text-3xl leading-none group-hover:text-[color:var(--accent)]">
        {category.label}
      </h2>
    </Link>
  );
}
