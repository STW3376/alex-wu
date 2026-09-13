import { site } from "@/content/site";

export function EmptyState({
  title = site.emptyTitle,
  body = site.emptyBody,
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="paper-card hairline relative overflow-hidden px-6 py-16 text-center sm:px-10">
      <div
        aria-hidden="true"
        className="mx-auto mb-6 flex h-20 w-28 items-center justify-center border border-dashed border-rule text-ink-soft"
      >
        <svg viewBox="0 0 64 40" className="h-10 w-16" focusable="false">
          <rect
            x="6"
            y="6"
            width="52"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M14 26 26 16l10 8 6-5 8 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <h2 className="font-display text-3xl text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">{body}</p>
    </div>
  );
}
