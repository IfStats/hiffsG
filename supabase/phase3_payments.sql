-- Phase 3: real payments (Paystack). Run after phase2_attendee_core.sql.

create table if not exists orders (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  buyer_user_id uuid references auth.users(id),
  qty integer not null default 1,
  amount numeric not null,       -- total, in GHS (major unit, e.g. 45.00)
  currency text not null default 'GHS',
  reference text not null unique, -- Paystack transaction reference
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz default now()
);

-- tickets created from a paid order carry the order id, so a receipt can
-- always be traced back to what was actually paid for.
alter table tickets add column if not exists order_id text references orders(id);

create index if not exists orders_event_id_idx on orders(event_id);
create index if not exists orders_reference_idx on orders(reference);

alter table orders enable row level security;

-- Anyone can start a pending order (that's just "I intend to pay").
-- Only the buyer, the event's owner, or an admin can read it back.
-- Only the verify-payment Edge Function (using the service role key, which
-- bypasses RLS entirely) is allowed to mark an order paid — no client-side
-- policy grants update, on purpose.
create policy "anyone can create a pending order" on orders for insert with check (true);
create policy "buyer or event owner or admin can read orders" on orders for select
  using (
    buyer_user_id = auth.uid()
    or is_admin()
    or exists (select 1 from events e where e.id = orders.event_id and e.organizer_id = auth.uid())
  );
