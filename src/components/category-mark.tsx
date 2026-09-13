import type { Category } from "@/db/schema";

const marks: Record<Category, { label: string; path: string }> = {
  drawings: {
    label: "Drawing mark",
    path: "M7 31c6-12 14-20 25-22 8-1 14 6 12 13-2 8-14 8-16 16 6-2 14 1 16 8 2 8-8 14-18 13C15 58 6 48 7 31Z",
  },
  animations: {
    label: "Animation mark",
    path: "M8 20h20l6-8h22v36H8V20Zm28 6v16l14-8-14-8Z",
  },
  music: {
    label: "Music mark",
    path: "M22 12v28a9 9 0 1 1-4-7V22l24-6v18a9 9 0 1 1-4-7V12L22 12Z",
  },
  comics: {
    label: "Comics mark",
    path: "M10 14h28v22H22l-8 8v-8H10V14Zm18 8h16v20h-6l-6 6v-6h-4V22Z",
  },
  inventions: {
    label: "Inventions mark",
    path: "M32 8 38 20l12 4-10 9 2 13-10-6-10 6 2-13-10-9 12-4L32 8Zm0 16a8 8 0 1 0 0.01 0Z",
  },
  crafts: {
    label: "Crafts mark",
    path: "M12 40c0-12 8-22 20-22s20 10 20 22H12Zm10-22 2-8h16l2 8M24 46h16v6H24z",
  },
};

export function CategoryMark({
  category,
  className = "h-10 w-10",
}: {
  category: Category;
  className?: string;
}) {
  const mark = marks[category];

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <title>{mark.label}</title>
      <path
        d={mark.path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
