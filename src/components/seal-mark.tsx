export function SealMark({ className = "h-8 w-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 40"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <title>Seal</title>
      <ellipse cx="32" cy="22" rx="22" ry="13" fill="currentColor" />
      <circle cx="52" cy="18" r="8" fill="currentColor" />
      <circle cx="55.5" cy="16.5" r="1.1" fill="var(--paper)" />
      <path
        d="M8 24c4 1 6 6 5 10M14 26c3 2 4 7 2 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
