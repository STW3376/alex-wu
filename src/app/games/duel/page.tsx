import type { Metadata } from "next";
import Link from "next/link";
import { DuelGame } from "@/components/duel-game";

export const metadata: Metadata = {
  title: "2D Duel",
  description:
    "A top-down duel by Alex Wu, originally written in Python with Tkinter and ported to the browser.",
};

const controls = [
  ["Arrow keys", "Move. You aim the way you last moved."],
  ["F", "Attack with the equipped weapon."],
  ["S", "Open or close the shop."],
  ["N", "Next level, after the level is clear. On the last level, N starts over."],
  ["R", "Restart the current level. Money and upgrades stay."],
];

export default function DuelPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
      <p className="text-sm text-ink-soft">
        <Link href="/games" className="hover:text-ink">
          Games
        </Link>
        {" · Made by Alex Wu"}
      </p>
      <h1 className="font-display mt-3 text-5xl sm:text-6xl">2D Duel</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Originally written in Python with Tkinter, and ported to run in the
        browser.
      </p>
      <p className="mt-4 max-w-2xl border border-rule bg-paper-deep px-4 py-3 text-sm text-ink-soft md:hidden">
        Best played on a computer with a keyboard.
      </p>

      <div className="relative z-50 mt-8">
        <DuelGame />
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="font-display text-3xl">Controls</h2>
          <dl className="mt-4 space-y-3 text-ink-soft">
            {controls.map(([key, detail]) => (
              <div key={key}>
                <dt className="font-medium text-ink">{key}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h2 className="font-display text-3xl">Original file</h2>
          <p className="mt-4 text-ink-soft">
            Alex wrote this as a desktop Python game. The Tkinter window cannot
            run on the web, so this page plays the same duel on a canvas. The
            source file is unchanged.
          </p>
          <a
            href="/games/duel/duel.py"
            download="duel.py"
            className="mt-4 inline-block text-lg hover:text-gold"
          >
            Download duel.py
          </a>
        </section>
      </div>
    </article>
  );
}
