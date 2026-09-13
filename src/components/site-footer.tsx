import Link from "next/link";
import { site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <p>{site.contact}</p>
        <Link href="/about" className="hover:text-ink">
          About
        </Link>
      </div>
    </footer>
  );
}
