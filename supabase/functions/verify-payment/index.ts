// Supabase Edge Function: verify-payment
//
// Called by the client right after Paystack's popup reports success.
// The client's word alone is never trusted — this function re-checks the
// transaction directly with Paystack's API using the SECRET key (which
// only exists here, server-side, never in the browser bundle), then uses
// the Supabase service-role key to insert the paid tickets, bypassing RLS
// on purpose: ticket creation for a paid order is only allowed to happen
// from here.
//
// Deploy: supabase functions deploy verify-payment
// Secrets needed (see README): PAYSTACK_SECRET_KEY
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically
// by the Supabase Edge Functions runtime — you don't set those yourself.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ticketCode(eventName) {
  const prefix = (eventName || "EVT").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "EVT";
  const body = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${body}`;
}
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!PAYSTACK_SECRET_KEY) return json({ error: "PAYSTACK_SECRET_KEY is not set on the server." }, 500);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Supabase service credentials missing." }, 500);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { reference } = body || {};
  if (!reference) return json({ error: "Missing 'reference'." }, 400);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Look up the pending order by reference.
  const { data: order, error: orderErr } = await admin.from("orders").select("*").eq("reference", reference).maybeSingle();
  if (orderErr) return json({ error: orderErr.message }, 500);
  if (!order) return json({ error: "No matching order for that reference." }, 404);

  if (order.status === "paid") {
    // Already processed (e.g. the client retried) — return the existing tickets instead of double-issuing.
    const { data: existing, error: tErr } = await admin.from("tickets").select("*").eq("order_id", order.id);
    if (tErr) return json({ error: tErr.message }, 500);
    return json({ status: "paid", tickets: existing });
  }

  // 2. Verify the transaction directly with Paystack — this is the step
  //    that actually matters; everything before it is just bookkeeping.
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const verifyJson = await verifyRes.json();

  if (!verifyRes.ok || !verifyJson?.status) {
    return json({ error: "Could not verify transaction with Paystack." }, 502);
  }

  const txn = verifyJson.data;
  const paystackAmountMajor = txn.amount / 100; // Paystack amounts are in kobo/pesewas
  const amountMatches = Math.abs(paystackAmountMajor - Number(order.amount)) < 0.01;

  if (txn.status !== "success" || !amountMatches) {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return json({ error: "Payment not successful or amount mismatch.", paystackStatus: txn.status }, 402);
  }

  // 3. Payment confirmed — fetch the event (for capacity/name) and issue tickets.
  const { data: event, error: evErr } = await admin.from("events").select("*").eq("id", order.event_id).maybeSingle();
  if (evErr || !event) return json({ error: "Event not found for this order." }, 404);

  const newTickets = Array.from({ length: order.qty }).map(() => ({
    id: uid(),
    event_id: order.event_id,
    buyer_name: order.buyer_name,
    buyer_email: order.buyer_email,
    buyer_user_id: order.buyer_user_id,
    qty: 1,
    code: ticketCode(event.name),
    checked_in: false,
    purchased_at: new Date().toISOString(),
    order_id: order.id,
  }));

  const { data: inserted, error: insErr } = await admin.from("tickets").insert(newTickets).select();
  if (insErr) return json({ error: insErr.message }, 500);

  await admin.from("orders").update({ status: "paid" }).eq("id", order.id);

  return json({ status: "paid", tickets: inserted });
});
