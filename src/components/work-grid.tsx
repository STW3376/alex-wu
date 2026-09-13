import type { Work } from "@/db/schema";
import { EmptyState } from "./empty-state";
import { WorkCard } from "./work-card";

export function WorkGrid({
  works,
  emptyTitle,
  emptyBody,
}: {
  works: Work[];
  emptyTitle?: string;
  emptyBody?: string;
}) {
  if (works.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {works.map((work) => (
        <WorkCard key={work.id} work={work} />
      ))}
    </div>
  );
}
