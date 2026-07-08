# Dictaz — deploy guide

This is the standalone version of the Dictaz app, wired up to a real
Supabase database instead of Claude's in-artifact storage. Follow these
steps in order — none of them require writing code.

## 1. Create the database (Supabase, free tier)

1. Go to https://supabase.com → sign up → **New project** (pick any name/region, free plan).
2. Once it's ready, open **SQL Editor** → **New query**.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
4. Go to **Settings → API**. You'll need two values from this page:
   - **Project URL**
   - **anon public** key

## 2. Add your credentials

1. Copy `.env.example` to a new file named `.env`.
2. Fill in the two values from step 1:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
   (`.env` is already git-ignored, so it won't get committed.)

## 3. Try it locally (optional but recommended)

```bash
npm install
npm run dev
```
Open the printed local URL and confirm events/tickets you create actually
show up in Supabase (**Table Editor → kv_store**).

## 4. Put it on GitHub

Create a new repo and push this folder to it. (Vercel and Netlify both
deploy straight from a Git repo, which is the easiest path and makes future
updates a simple `git push`.)

## 5. Deploy — pick one

### Option A: Vercel
1. Go to https://vercel.com/new and import your GitHub repo.
2. Framework preset: **Vite** (should auto-detect).
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` with the same values as your `.env`.
4. Click **Deploy**. You'll get a public `*.vercel.app` link.

### Option B: Netlify
1. Go to https://app.netlify.com → **Add new site → Import an existing project**.
2. Connect the repo. Build command: `npm run build`. Publish directory: `dist`.
3. Under **Site settings → Environment variables**, add the same two
   `VITE_...` values.
4. Deploy. You'll get a public `*.netlify.app` link.

Either way, that public link is what you can share outside Claude.

## Security note

The database policies in `supabase/schema.sql` are wide open — anyone who
has your Supabase anon key (which is visible in the deployed site's code)
can read and write every event, ticket, and vendor record. That's fine for
an internal tool, a demo, or a small trusted group, but it is **not**
appropriate for a public-facing ticketing site handling real transactions.
Getting there would mean adding real user accounts (Supabase Auth) and
row-level policies scoped to each user/role — a bigger step, but a natural
next one if this grows past the demo stage.

## What still isn't real

- **Payments** are still mocked — "buying" a ticket just writes a record,
  no money moves. Wiring up real payments needs a payment processor
  (e.g. Stripe) and, ideally, a small server-side function so card details
  never touch the browser directly.
- **Vendor sign-in** is name+email only, no password — fine for a demo,
  not for real accounts.
