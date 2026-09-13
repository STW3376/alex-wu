import type { Metadata } from "next";
import Link from "next/link";
import { AddWorkForm, UnlockForm } from "@/components/admin-forms";
import { listWorks } from "@/db/queries";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { blobConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Studio desk",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const unlocked = await isAdmin();
  const configured = adminConfigured();
  const works = unlocked ? await listWorks() : [];
  const blobReady = blobConfigured();

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
      <h1 className="font-display text-6xl">Add a piece</h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        For Ted and Alex. Upload a file. The piece shows up in that room.
      </p>

      <div className="mt-10">
        {!configured ? (
          <p className="text-ink-soft">
            Set <code className="text-ink">ADMIN_SECRET</code> before this desk
            can unlock.
          </p>
        ) : unlocked ? (
          <AddWorkForm blobReady={blobReady} />
        ) : (
          <UnlockForm />
        )}
      </div>

      {unlocked ? (
        <section className="mt-14">
          <h2 className="font-display text-4xl">On the wall</h2>
          {works.length === 0 ? (
            <p className="mt-3 text-ink-soft">Nothing saved yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-rule border-y border-rule">
              {works.map((work) => (
                <li
                  key={work.id}
                  className="flex items-baseline justify-between gap-4 py-3"
                >
                  <Link href={`/work/${work.slug}`} className="hover:text-gold">
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
