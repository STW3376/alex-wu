import { WorkCard } from "@/components/work-card";
import { listWorks } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const works = await listWorks();
  const film = works.find((work) => work.category === "animations");
  const drawings = works.filter((work) => work.category === "drawings");
  const lute = drawings.find((work) => work.slug === "golden-lute");
  const others = drawings.filter((work) => work.slug !== "golden-lute");

  return (
    <div className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
      <section className="grid gap-8 lg:grid-cols-12">
        {lute ? (
          <div className="lg:col-span-7">
            <WorkCard work={lute} featured />
          </div>
        ) : null}
        <div className="grid gap-8 lg:col-span-5">
          {film ? <WorkCard work={film} variant="time" /> : null}
          <div className="grid gap-8 sm:grid-cols-2">
            {others.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
