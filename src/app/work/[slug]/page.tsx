import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkMedia } from "@/components/work-media";
import { workAlt, workCredit, workSubtitle } from "@/content/catalog";
import { categoryBySlug } from "@/content/categories";
import { getWorkBySlug } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  if (!work) {
    return { title: "Work" };
  }
  return {
    title: work.title,
    description: work.description ?? workSubtitle(work.slug) ?? workAlt(work),
  };
}

export default async function WorkPage({
  params,
}: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  if (!work) {
    notFound();
  }

  const category = categoryBySlug[work.category];
  const credit = workCredit(work.slug);
  const subtitle = workSubtitle(work.slug);

  return (
    <article className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
      <WorkMedia work={work} />
      <h1 className="font-display mt-8 text-5xl sm:text-6xl">{work.title}</h1>
      {subtitle ? <p className="mt-2 text-lg text-ink-soft">{subtitle}</p> : null}
      <p className="mt-3 text-sm text-ink-soft">
        <Link href={`/${work.category}`} className="hover:text-ink">
          {category.label}
        </Link>
        {work.year ? ` · ${work.year}` : ""}
        {credit ? ` · ${credit}` : ""}
      </p>
      {work.description ? (
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {work.description}
        </p>
      ) : null}
    </article>
  );
}
