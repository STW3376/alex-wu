export type GameEntry = {
  slug: string;
  title: string;
  summary: string;
};

export const games: GameEntry[] = [
  {
    slug: "duel",
    title: "2D Duel",
    summary: "Top-down duel with a shop and three levels.",
  },
];
