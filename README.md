# Alex Wu — Studio

A public paper-studio portfolio for Alex Wu: drawings, animations, music, comics, inventions, crafts, and photography.

Pieces live in Neon Postgres. Files uploaded from `/admin` are stored in Vercel Blob. Empty rooms stay empty until a real piece is ready.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Drizzle ORM + Neon Postgres
- Vercel Blob for uploads
- Vercel for hosting

## Local setup

1. Install Node.js 22+ and clone this repo.
2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Set variables in `.env.local`:

   | Variable | What it is |
   | --- | --- |
   | `DATABASE_URL` | Neon connection string. A pooled URL is fine. |
   | `ADMIN_SESSION_SECRET` | Long random string that signs the `/admin` cookie. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
   | `BLOB_READ_WRITE_TOKEN` | Vercel Blob token. Required on Vercel. Local `/admin` can save files to `public/uploads` without it. |

   Password env vars (`ADMIN_TED_PASSWORD`, `ADMIN_ALEX_PASSWORD`) are only for the one-shot script below. They are not required on Vercel.

   A Neon project named **alex-wu** already exists in the [Neon console](https://console.neon.tech). Never commit `.env.local`.

4. Install and migrate:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```

   The seed upserts four real pieces from `src/content/catalog.ts`: *The Entire Observable Seal*, *The Wizard*, *Golden Lute*, and *祖*. Music, comics, inventions, crafts, and photography stay empty.

5. Set the two desk logins (hashes only go into Neon; nothing is stored in git):

   ```bash
   # Put the real passwords in your shell env or .env.local, then:
   npm run db:set-admin-passwords
   ```

   If one of those env vars is missing, that user is skipped. You can also set one person at a time:

   ```bash
   npm run db:set-admin-passwords -- ted
   npm run db:set-admin-passwords -- alex
   ```

   Those commands read `ADMIN_TED_PASSWORD` / `ADMIN_ALEX_PASSWORD`. You may pass the password as a second CLI argument instead. Do not put real passwords in the repo, in README examples that get committed, or in Vercel env vars after the hashes are in Neon.

6. Run the site:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Adding a piece

1. On Vercel, create a Blob store for the project so `BLOB_READ_WRITE_TOKEN` is set.
2. Visit `/admin` and sign in as `ted` or `alex` (lowercase usernames).
3. Title, room, optional year and description, then upload files. Comics: several images, one per page.
4. Paste-URL is under Advanced, not the main path.
5. Use **Change password** on the desk to rotate a password. That writes a new hash to Neon.

`/admin` is private: `noindex`, blocked in `robots.ts`, and the upload form is not sent until someone is signed in. After five failed sign-ins, that username is locked for 15 minutes. Sessions last 7 days.

The short About text lives in `src/content/site.ts`.

## Deploy on Vercel

1. Import this GitHub repo in [Vercel](https://vercel.com/new).
2. Framework preset: Next.js. Build command: `npm run build`.
3. Add environment variables:
   - `DATABASE_URL`
   - `ADMIN_SESSION_SECRET`
   - `BLOB_READ_WRITE_TOKEN` (from a Blob store on the project)
4. Deploy.
5. Run migrations once against the same Neon database (`npm run db:migrate`).
6. From your laptop, with `DATABASE_URL` pointing at that Neon database, set the two passwords with `npm run db:set-admin-passwords` as above. You can remove the old `ADMIN_SECRET` from Vercel; it is no longer used.

No secrets belong in the repo.

## Privacy

No home address, school name, contact form, or child’s email. The footer says: “Want to say hi? Ask a parent to reach out.”

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local site |
| `npm run build` | Production build |
| `npm run db:generate` | Create a new Drizzle migration after schema changes |
| `npm run db:migrate` | Apply migrations to Neon |
| `npm run db:seed` | Upsert the four real catalog pieces |
| `npm run db:set-admin-passwords` | Hash `ADMIN_TED_PASSWORD` / `ADMIN_ALEX_PASSWORD` (or CLI args) and store them in Neon |
