import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryMark } from "@/components/category-mark";
import { WorkGrid } from "@/components/work-grid";
import { accentClass, categories, isCategory } from "@/content/categories";
import { listWorksByCategory } from "@/db/queries";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  if (!isCategory(slug)) {
    return { title: "Studio" };
  }
  const category = categories.find((item) => item.slug === slug);
  return {
    title: category?.label,
    description: category?.invitation,
  };
}

export default async function CategoryPage({
  params,
}: PageProps<"/[category]">) {
  const { category: slug } = await params;
  if (!isCategory(slug)) {
    notFound();
  }

  const category = categories.find((item) => item.slug === slug);
  if (!category) {
    notFound();
  }

  const works = await listWorksByCategory(slug);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <header className={`${accentClass[category.accent]} max-w-2xl space-y-4`}>
        <CategoryMark
          category={category.slug}
          className="h-12 w-12 text-[color:var(--accent)]"
        />
        <p className="text-[0.72rem] font-semibold tracking-[0.28em] text-ink-soft uppercase">
          Studio room
        </p>
        <h1 className="font-display text-5xl leading-none sm:text-6xl">
          {category.label}
        </h1>
        <p className="text-lg text-ink-soft">{category.invitation}</p>
      </header>
      <div className="mt-12">
        <WorkGrid works={works} />
      </div>
    </div>
  );
}
