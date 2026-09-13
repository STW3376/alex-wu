import Link from "next/link";
import { accentClass, type CategoryMeta } from "@/content/categories";
import { CategoryMark } from "./category-mark";

export function CategoryCard({
  category,
  featured = false,
}: {
  category: CategoryMeta;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/${category.slug}`}
      className={`${accentClass[category.accent]} paper-card hairline group relative flex min-h-52 flex-col justify-between overflow-hidden p-6 transition-transform motion-safe:hover:-translate-y-0.5 ${
        featured ? "sm:min-h-72" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute -right-6 -top-8 h-28 w-28 rounded-full opacity-20"
        style={{ background: "var(--accent)" }}
      />
      <CategoryMark
        category={category.slug}
        className="h-11 w-11 text-[color:var(--accent)]"
      />
      <div className="relative space-y-2">
        <h2 className="font-display text-3xl leading-none">{category.label}</h2>
        <p className="max-w-sm text-sm text-ink-soft">{category.phrase}</p>
        <p className="pt-2 text-sm text-ink underline-offset-4 group-hover:underline">
          Enter the studio
        </p>
      </div>
    </Link>
  );
}
