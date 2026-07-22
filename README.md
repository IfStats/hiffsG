# Dictaz — deploy guide

This is the standalone version of the Dictaz app, wired up to a real
Supabase database instead of Claude's in-artifact storage. Follow these
steps in order — none of them require writing code.

## 1. Create the database (Supabase, free tier)

1. Go to https://supabase.com → sign up → **New project** (pick any name/region, free plan).
2. Once it's ready, open **SQL Editor** → **New query**.
3. Paste the contents of `supabase/schema.sql` and click **Run**. This creates
   real, linked tables — `events`, `tickets`, `tasks`, `budget_items`,
   `vendors`, `timeline_items`, `submissions` — with foreign keys back to
   `events` and cascading deletes (delete an event, its tickets/tasks/
   budget/vendors/timeline go with it automatically).
4. Run `supabase/phase1_auth_roles.sql` next (new query, paste, run). This
   adds:
   - A `profiles` table (role: attendee / organizer / admin), auto-created
     for every new signup via a database trigger
   - Ownership columns (`events.organizer_id`, `submissions.submitted_by`)
   - Real row-level-security policies replacing the old wide-open ones —
     browsing events stays public, but creating/editing/deleting is now
     scoped to the owning organizer or an admin
5. Run `supabase/phase2_attendee_core.sql` next (new query, paste, run).
   This adds:
   - `category` and `city` on events (powers search/filter and category
     browsing)
   - `buyer_user_id` on tickets (so purchases while logged in show up
     under "My Tickets")
   - A `favorites` table (private per user) and a `reviews` table (public
     to read, writable only by signed-in users, as themselves)
6. **Make your own account an admin.** Sign up in the running app once
   (any account works), then in Supabase go to **Table Editor → profiles**,
   find your row, and change `role` from `attendee` to `admin`. That's the
   only way to get the first admin — from then on, you can approve
   organizers from the app's Admin tab.
7. Go to **Settings → API**. You'll need two values from this page:
   - **Project URL**
   - **anon public** key

> **Upgrading from the earlier single-table (`kv_store`) version?** The
> relational schema replaces it entirely — the app no longer talks to
> `kv_store`. Once you've confirmed the new tables work, you can drop the
> old one (commented-out line at the bottom of `schema.sql`).

### About email confirmation

By default, Supabase requires confirming your email before you can log in.
For quick local testing you can turn this off: **Authentication → Providers
→ Email → toggle off "Confirm email"**. Leave it on for a real launch.

## 1b. Set up real payments (Paystack)

Paid tickets go through Paystack. This needs three things: a database
table, a piece of server code (a Supabase Edge Function) that verifies the
payment, and your Paystack keys wired into the right places.

1. Run `supabase/phase3_payments.sql` in the SQL editor (after phase1/phase2).
   This adds an `orders` table and links `tickets` back to the order that
   paid for them.
2. **Install the Supabase CLI** if you don't have it:
   ```bash
   npm install -g supabase
   ```
3. **Log in and link this project:**
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```
   (`your-project-ref` is in your Supabase project URL, or under
   Settings → General.)
4. **Set your Paystack secret key as a function secret** — this is the
   `sk_...` key from your Paystack dashboard. It must never appear in
   client code, an `.env` file, or a Vercel env var — only here:
   ```bash
   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_secret_key
   ```
5. **Deploy the verification function:**
   ```bash
   supabase functions deploy verify-payment
   ```
6. Add your Paystack **public** key (`pk_...`) to `.env` and to Vercel's
   environment variables (see the next two sections) as
   `VITE_PAYSTACK_PUBLIC_KEY` — this one *is* safe to expose in the browser.

**Why a server-side function at all?** The browser can't be trusted to
report "the payment succeeded" — anyone could fake that with dev tools.
`verify-payment` re-checks the transaction directly with Paystack's API
using the secret key, and only then issues the tickets, using Supabase's
service-role key (which bypasses row-level security on purpose — ticket
issuance for a paid order is only allowed to happen from this function,
never directly from the client).

## 2. Add your credentials

1. Copy `.env.example` to a new file named `.env`.
2. Fill in the values from the steps above:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
   ```
   (`.env` is already git-ignored, so it won't get committed.)

## 3. Try it locally (optional but recommended)

```bash
npm install
npm run dev
```
Open the printed local URL and confirm events/tickets you create actually
show up in Supabase (**Table Editor → events**, **tickets**, etc.).

## 4. Put it on GitHub

Create a new repo and push this folder to it. (Vercel and Netlify both
deploy straight from a Git repo, which is the easiest path and makes future
updates a simple `git push`.)

## 5. Deploy — pick one

### Option A: Vercel
1. Go to https://vercel.com/new and import your GitHub repo.
2. Framework preset: **Vite** (should auto-detect).
3. Under **Environment Variables**, add `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, and `VITE_PAYSTACK_PUBLIC_KEY` with the same
   values as your `.env`.
4. Click **Deploy**. You'll get a public `*.vercel.app` link.

### Option B: Netlify
1. Go to https://app.netlify.com → **Add new site → Import an existing project**.
2. Connect the repo. Build command: `npm run build`. Publish directory: `dist`.
3. Under **Site settings → Environment variables**, add the same three
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

- ~~Payments are mocked~~ — fixed for card/Mobile Money via Paystack.
  **Flutterwave isn't wired up** (you said Paystack first); it can be
  added the same way later.
- **No refund flow yet** — an attendee can't request one, and there's no
  admin screen to process one. Paystack supports refunds via their API;
  this just isn't built into the app yet.
- **No Paystack webhook as a fallback** — verification currently happens
  only when the browser calls `verify-payment` right after the popup
  closes. If someone pays and then closes the tab before that call
  completes, the payment could succeed on Paystack's side without a
  ticket ever being issued. Adding a webhook (Paystack → a second Edge
  Function) as a backup path is the standard fix — worth doing before a
  real launch.
- **Currency is hardcoded to GHS** — fine for Ghana-only for now; a
  multi-currency event would need the currency to come from the event
  itself.
- ~~Vendor sign-in is name+email only~~ — fixed: submitting an event now
  requires a real account (Supabase Auth), and the identity is pulled from
  your profile automatically.
- **No image uploads yet** — event pages use a styled gradient banner
  instead of a real hero image/gallery/video. Adding real image uploads
  needs Supabase Storage, which isn't wired up yet.
- **Related events** are matched by category only — no "nearby" (needs
  geolocation) or "recommended for you" (needs a real recommendation
  approach) yet.
- **No Apple/Google Wallet passes, no email reminders** — those need
  additional services (a pass-signing service, an email/SMS provider) on
  top of what's here.
