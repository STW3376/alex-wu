import Link from "next/link";
import { site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-20 border-t border-rule/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <p>
          <span className="font-display text-base text-ink">{site.name}</span>
          <span className="mx-2 text-rule">/</span>
          {site.contact}
        </p>
        <p>
          <Link href="/about" className="underline-offset-4 hover:text-ink hover:underline">
            About this studio
          </Link>
        </p>
      </div>
    </footer>
  );
}
