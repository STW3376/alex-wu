import { site } from "@/content/site";
import { SealMark } from "./seal-mark";

export function EmptyState({
  title = site.emptyTitle,
  body = site.emptyBody,
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="px-2 py-16 text-center">
      <SealMark className="mx-auto mb-5 h-8 w-14 text-seal" />
      <h2 className="font-display text-4xl text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">{body}</p>
    </div>
  );
}
