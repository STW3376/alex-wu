# Alex Wu — Studio

A public portfolio for Alex Wu: drawings, animations, music, comics, inventions, and handmade crafts.

The site is a Next.js App Router app. Portfolio pieces live in Neon Postgres. Ted or Alex can add a real piece later from a simple secret-protected desk at `/admin`. Empty rooms stay empty until something real is ready — this first version does not invent artwork.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Drizzle ORM
- Neon Postgres
- Vercel for hosting

## Local setup

1. Install Node.js 22+ and clone this repo.
2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Set the two variables in `.env.local`:

   | Variable | What it is |
   | --- | --- |
   | `DATABASE_URL` | Neon connection string. A pooled URL is fine. |
   | `ADMIN_SECRET` | A long random phrase. Needed to unlock `/admin`. |

   A Neon project named **alex-wu** can be created in the [Neon console](https://console.neon.tech). Copy the connection string from that project. Never commit `.env.local`.

4. Install and migrate:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```

   The seed upserts Alex’s real pieces from `src/content/catalog.ts`: *The Entire Observable Seal*, *The Wizard*, *Golden Lute*, and *祖*. Music, comics, inventions, and crafts stay empty.

5. Run the site:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Adding a piece

1. Host the file somewhere public (Vercel Blob, a public image host, YouTube, Vimeo, or a direct audio/video URL).
2. Visit `/admin` and enter `ADMIN_SECRET`.
3. Fill in title, room, media type, optional year and description, and paste `https://` links (one per line). Comics use one page URL per line.

Edit the short bio and intro anytime in `src/content/site.ts`.

## Deploy on Vercel

1. Import this GitHub repo in [Vercel](https://vercel.com/new).
2. Framework preset: Next.js. Build command: `npm run build`.
3. Add environment variables for Production (and Preview if you want the admin desk there too):
   - `DATABASE_URL`
   - `ADMIN_SECRET`
4. Deploy.
5. Run migrations once against the same Neon database (`npm run db:migrate` locally, or paste the SQL in `drizzle/` into the Neon SQL editor).

No secrets belong in the repo. GitHub + Neon + Vercel are enough.

## Privacy

This is a kid’s public studio. The site does not include a home address, a school name, a contact form, or a child’s email. The footer only says: “Want to say hi? Ask a parent to reach out.”

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local site |
| `npm run build` | Production build |
| `npm run db:generate` | Create a new Drizzle migration after schema changes |
| `npm run db:migrate` | Apply migrations to Neon |
| `npm run db:seed` | Confirm the works table is ready (inserts nothing) |
