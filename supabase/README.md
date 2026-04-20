Supabase CLI setup for this project.

1. Install the Supabase CLI if you prefer a global install, or use the provided npm scripts with `npx`.
2. Run `npm run supabase:login`.
3. Run `npm run supabase:link -- <your-project-ref>` from the terminal.
4. Run `npm run supabase:db:push` to apply the migrations in `supabase/migrations` to the linked project.
5. Optionally run `npm run supabase:types` to generate TypeScript database types after schema changes.

Notes:
- The app runtime still uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`.
- The `task_log_events` table migration comes before owner-based RLS because the owner migration alters that table.