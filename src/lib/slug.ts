export function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "work";
}

export function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>) {
  return (async () => {
    if (!(await taken(base))) {
      return base;
    }

    for (let index = 2; index < 100; index += 1) {
      const candidate = `${base}-${index}`;
      if (!(await taken(candidate))) {
        return candidate;
      }
    }

    return `${base}-${Date.now().toString(36)}`;
  })();
}
