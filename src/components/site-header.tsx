import Link from "next/link";
import { categories } from "@/content/categories";
import { site } from "@/content/site";
import { SealMark } from "./seal-mark";

export function SiteHeader() {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-5 pt-8 sm:px-8">
        <Link href="/" className="font-display text-5xl text-ink sm:text-6xl">
          {site.name}
        </Link>
        <SealMark className="mb-2 h-7 w-12 text-seal" />
      </div>
      <nav
        aria-label="Studio rooms"
        className="mx-auto mt-5 flex max-w-6xl flex-wrap gap-x-4 gap-y-2 px-5 pb-6 sm:px-8"
      >
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/${category.slug}`}
            className="font-display text-xl text-ink-soft hover:text-ink"
          >
            {category.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
