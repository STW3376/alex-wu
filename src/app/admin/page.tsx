import type { Metadata } from "next";
import Link from "next/link";
import { AddWorkForm, UnlockForm } from "@/components/admin-forms";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { listWorks } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Studio desk",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const unlocked = await isAdmin();
  const configured = adminConfigured();
  const works = unlocked ? await listWorks() : [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-[0.72rem] font-semibold tracking-[0.28em] text-ink-soft uppercase">
        Private desk
      </p>
      <h1 className="font-display mt-3 text-5xl leading-none">Add a piece</h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        This page is for Ted and Alex. Paste links to images, videos, or audio.
        Nothing fake gets invented here — only real work belongs on the wall.
      </p>

      <div className="mt-10">
        {!configured ? (
          <div className="paper-card hairline p-6 text-ink-soft">
            Set <code className="text-ink">ADMIN_SECRET</code> in the environment
            before this desk can unlock.
          </div>
        ) : unlocked ? (
          <AddWorkForm />
        ) : (
          <UnlockForm />
        )}
      </div>

      {unlocked ? (
        <section className="mt-12">
          <h2 className="font-display text-3xl">On the wall</h2>
          {works.length === 0 ? (
            <p className="mt-3 text-ink-soft">
              Zero artworks so far. The first real piece you add will show up in
              its room.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-rule border-y border-rule">
              {works.map((work) => (
                <li key={work.id} className="flex items-baseline justify-between gap-4 py-3">
                  <Link href={`/work/${work.slug}`} className="hover:underline">
                    {work.title}
                  </Link>
                  <span className="text-sm text-ink-soft">{work.category}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
