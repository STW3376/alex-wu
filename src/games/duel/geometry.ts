export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function intersects(a: Rect, b: Rect) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

export function norm(
  x: number,
  y: number,
  fallback: readonly [number, number],
): [number, number] {
  const mag = Math.hypot(x, y);
  if (mag < 1e-6) {
    return [fallback[0], fallback[1]];
  }
  return [x / mag, y / mag];
}
