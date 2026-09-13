import { CategoryCard } from "@/components/category-card";
import { FeaturedWork } from "@/components/featured-work";
import { categories } from "@/content/categories";
import { site } from "@/content/site";
import { getFeaturedWork } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await getFeaturedWork();
  const [drawings, animations, music, comics, inventions, crafts] = categories;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <section className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-[0.72rem] font-semibold tracking-[0.3em] text-ink-soft uppercase">
            {site.kicker}
          </p>
          <h1 className="font-display mt-3 text-6xl leading-[0.9] sm:text-7xl md:text-8xl">
            {site.name}
          </h1>
        </div>
        <p className="max-w-md text-lg leading-relaxed text-ink-soft">
          {site.intro}
        </p>
      </section>

      {featured ? <FeaturedWork work={featured} /> : null}

      <section className="mt-16" aria-labelledby="studio-index">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="studio-index" className="font-display text-3xl">
            Six rooms
          </h2>
          <p className="max-w-sm text-sm text-ink-soft">
            A film and three drawings are up. Music, comics, inventions, and
            crafts stay empty until more real work is ready.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-6">
          <div className="md:col-span-4">
            <CategoryCard category={drawings} featured />
          </div>
          <div className="md:col-span-2">
            <CategoryCard category={animations} />
          </div>
          <div className="md:col-span-2">
            <CategoryCard category={music} />
          </div>
          <div className="md:col-span-4">
            <CategoryCard category={comics} featured />
          </div>
          <div className="md:col-span-3">
            <CategoryCard category={inventions} />
          </div>
          <div className="md:col-span-3">
            <CategoryCard category={crafts} />
          </div>
        </div>
      </section>
    </div>
  );
}
