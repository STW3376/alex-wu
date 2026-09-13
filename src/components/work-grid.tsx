import type { CategoryMeta } from "@/content/categories";
import type { Work } from "@/db/schema";
import { EmptyState } from "./empty-state";
import { WorkCard } from "./work-card";

export function WorkGrid({
  works,
  variant = "paper",
}: {
  works: Work[];
  variant?: CategoryMeta["variant"];
}) {
  if (works.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className={`grid gap-8 ${
        variant === "photo"
          ? "sm:grid-cols-2"
          : "sm:grid-cols-2 xl:grid-cols-3"
      }`}
    >
      {works.map((work) => (
        <WorkCard key={work.id} work={work} variant={variant} />
      ))}
    </div>
  );
}
