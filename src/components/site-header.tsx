import Link from "next/link";
import { categories } from "@/content/categories";
import { site } from "@/content/site";

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-rule/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-ink-soft uppercase">
            Studio
          </p>
          <Link
            href="/"
            className="font-display text-3xl leading-none text-ink sm:text-4xl"
          >
            {site.name}
          </Link>
        </div>
        <nav aria-label="Studio sections" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/${category.slug}`}
              className="text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              {category.label}
            </Link>
          ))}
          <Link
            href="/about"
            className="text-ink underline-offset-4 hover:underline"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
