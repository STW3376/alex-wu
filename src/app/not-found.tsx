import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-6xl">This page wandered off.</h1>
      <Link href="/" className="mt-6 inline-block text-lg hover:text-gold">
        Back to the studio
      </Link>
    </div>
  );
}
