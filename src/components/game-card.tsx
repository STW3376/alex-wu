import Link from "next/link";
import type { GameEntry } from "@/content/games";

export function GameCard({ game }: { game: GameEntry }) {
  return (
    <article>
      <Link href={`/games/${game.slug}`} className="group block">
        <div className="relative aspect-[980/640] overflow-hidden bg-[#0b1020]">
          {game.slug === "duel" ? <DuelPreview /> : null}
        </div>
        <h2 className="font-display mt-3 text-2xl leading-none group-hover:text-gold">
          {game.title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{game.summary}</p>
      </Link>
    </article>
  );
}

function DuelPreview() {
  return (
    <svg viewBox="0 0 980 640" className="h-full w-full" aria-hidden="true">
      <rect width="980" height="640" fill="#0b1020" />
      <rect x="0" y="0" width="980" height="18" fill="#0f172a" />
      <rect x="0" y="622" width="980" height="18" fill="#0f172a" />
      <rect x="0" y="0" width="18" height="640" fill="#0f172a" />
      <rect x="962" y="0" width="18" height="640" fill="#0f172a" />
      <rect x="320" y="90" width="40" height="460" fill="#111827" stroke="#334155" strokeWidth="2" />
      <rect x="600" y="90" width="40" height="460" fill="#111827" stroke="#334155" strokeWidth="2" />
      <rect x="420" y="260" width="140" height="40" fill="#111827" stroke="#334155" strokeWidth="2" />
      <circle cx="160" cy="320" r="16" fill="#34d399" stroke="#052e2b" strokeWidth="3" />
      <polygon points="188,320 179,313 179,327" fill="#bbf7d0" />
      <circle cx="820" cy="320" r="18" fill="#fb7185" stroke="#450a0a" strokeWidth="3" />
      <polygon points="790,320 801,313 801,327" fill="#fecdd3" />
      <circle cx="210" cy="320" r="5" fill="#fbbf24" />
      <circle cx="760" cy="320" r="4" fill="#93c5fd" />
    </svg>
  );
}
