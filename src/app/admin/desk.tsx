import Link from "next/link";
import { AddWorkForm, ChangePasswordForm } from "@/components/admin-forms";
import { listWorks } from "@/db/queries";
import type { AdminUsername } from "@/lib/admin-usernames";
import { blobConfigured } from "@/lib/storage";

export async function AdminDesk({ username }: { username: AdminUsername }) {
  const works = await listWorks();
  const blobReady = blobConfigured();

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
      <h1 className="font-display text-6xl">Add a piece</h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        Signed in as {username}. Upload a file. The piece shows up in that room.
      </p>

      <div className="mt-10">
        <AddWorkForm blobReady={blobReady} />
      </div>

      <section className="mt-14">
        <h2 className="font-display text-4xl">Change password</h2>
        <p className="mt-3 max-w-xl text-sm text-ink-soft">
          Current password, then a new one at least 10 characters long.
        </p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </section>

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
    </div>
  );
}
