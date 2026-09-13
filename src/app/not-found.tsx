import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <p className="text-[0.72rem] font-semibold tracking-[0.28em] text-ink-soft uppercase">
        Missing page
      </p>
      <h1 className="font-display mt-3 text-5xl">This page wandered off.</h1>
      <p className="mt-4 text-ink-soft">
        Try the studio home, or pick a room from the top of the page.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block border border-ink bg-ink px-4 py-2 text-sm text-paper"
      >
        Back to the studio
      </Link>
    </div>
  );
}
