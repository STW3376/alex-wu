import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkGrid } from "@/components/work-grid";
import { categories, isCategory } from "@/content/categories";
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
    <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
      <header className="mb-10">
        <h1 className="font-display text-6xl">{category.label}</h1>
      </header>
      <WorkGrid works={works} variant={category.variant} />
    </div>
  );
}
