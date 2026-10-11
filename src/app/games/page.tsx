import type { Metadata } from "next";
import { GameCard } from "@/components/game-card";
import { games } from "@/content/games";

export const metadata: Metadata = {
  title: "Games",
  description: "Playable games by Alex Wu.",
};

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
      <header className="mb-10">
        <h1 className="font-display text-6xl">Games</h1>
      </header>
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
    </div>
  );
}
