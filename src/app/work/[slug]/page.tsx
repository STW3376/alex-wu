import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkMedia } from "@/components/work-media";
import { categoryBySlug } from "@/content/categories";
import { workAlt, workCredit, workSubtitle } from "@/content/catalog";
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
    description:
      work.description ??
      workSubtitle(work.slug) ??
      workAlt(work),
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

  return (
    <article className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-[0.72rem] font-semibold tracking-[0.28em] text-ink-soft uppercase">
        <Link href={`/${work.category}`} className="hover:text-ink">
          {category.label}
        </Link>
        {work.year ? ` · ${work.year}` : ""}
        {credit ? ` · ${credit}` : ""}
      </p>
      <h1 className="font-display mt-3 text-5xl leading-tight sm:text-6xl">
        {work.title}
      </h1>
      {workSubtitle(work.slug) ? (
        <p className="mt-3 text-xl text-ink-soft">{workSubtitle(work.slug)}</p>
      ) : null}
      {work.description ? (
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {work.description}
        </p>
      ) : null}
      <div className="mt-10">
        <WorkMedia work={work} />
      </div>
    </article>
  );
}
