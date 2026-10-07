# Spot OS

Studio Spot's internal operating system. Home, Calendar, Projects, Library, Reviews, Spot Base and Settings in one calm, Notion-style workspace for three people.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres, Auth, Realtime, Storage) · Tiptap · Vercel.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the schema, realtime design, Google integration and the decisions behind them.

## Design directions

One build ships three design directions. Switch between them in **Settings → Appearance → Design direction**, or with a link: `?direction=1|2|3`. The choice is stored in a cookie, so the same page and the same data re-render in the other design.

| # | Name | Code |
| --- | --- | --- |
| 1 | Classic (Notion-style) | `src/components`, `src/lib`, `src/styles/direction-1.css` |
| 2 | Chunks (colour cards) | `src/directions/d2`, `src/styles/direction-2.css` |
| 3 | Playful (Duolingo-style) | `src/directions/d3`, `src/styles/direction-3.css` |

The route files in `src/app` pick the active direction's component on the server (`src/lib/direction-server.ts`). Each direction's CSS is scoped to `<html data-direction="N">`. `NEXT_PUBLIC_DEFAULT_DIRECTION` sets the direction first-time visitors see (default 1).

---

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

With no Supabase keys, Spot OS runs in **demo mode**: sample data lives in your browser's localStorage, you sign in by picking a sample member, and open tabs sync live (like Realtime). Reset it under **Settings → Data**.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_init.sql`, either in the SQL editor or with `supabase db push` via the CLI. This creates the tables, RLS, triggers, Realtime publication and the private `attachments` bucket.
3. **Authentication → Providers → Email:** keep Email enabled and **turn off "Allow new users to sign up"**.
4. **Authentication → URL configuration:** set the Site URL to your app URL, and add `http://localhost:3000/auth/callback` plus `https://<your-domain>/auth/callback` to the redirect URLs.
5. **Authentication → Users → Invite user** for each of the three members. Their profile is created automatically. Members set a password via the invite link, or use "Email me a sign-in link".
6. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
7. Restart `npm run dev`, sign in, then open **Spot Base → Add starter pages** and **Settings → Finance** to connect the sheet.

## Connect the finance sheet

Settings → Finance → paste the Google Sheet URL (the specific tab). Map the column headers, then press **Test connection** to preview, then **Save**.
The sheet must be viewable by link, or published to the web as CSV. Spot OS reads it and never writes to it.

## Deploy to Vercel

1. Import the GitHub repo in Vercel (framework: Next.js, root directory: repository root).
2. Add the same environment variables (plus the optional Google ones).
3. Add the production `/auth/callback` URL in Supabase (step 4 above).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (type-checks) |
| `npm run lint` | ESLint (incl. React Compiler rules) |
