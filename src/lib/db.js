import { requireClient, configured } from "./supabaseClient.js";

/* ---- row <-> app-object mapping (only needed where field names differ) ---- */
const eventToRow = (e) => ({
  id: e.id,
  name: e.name,
  description: e.description || "",
  date: e.date,
  time: e.time || null,
  location: e.location,
  price: e.price,
  capacity: e.capacity,
  organizer_id: e.organizerId || null,
  category: e.category || null,
  city: e.city || null,
  image_url: e.imageUrl || null,
});
const eventFromRow = (r) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  date: r.date,
  time: r.time,
  location: r.location,
  price: r.price,
  capacity: r.capacity,
  organizerId: r.organizer_id,
  category: r.category,
  city: r.city,
  imageUrl: r.image_url,
});

const ticketToRow = (t) => ({
  id: t.id,
  event_id: t.eventId,
  buyer_name: t.buyerName,
  buyer_email: t.buyerEmail,
  buyer_user_id: t.buyerUserId || null,
  qty: t.qty,
  code: t.code,
  checked_in: !!t.checkedIn,
  checked_in_at: t.checkedInAt || null,
  purchased_at: t.purchasedAt || new Date().toISOString(),
});
const ticketFromRow = (r) => ({
  id: r.id,
  eventId: r.event_id,
  buyerName: r.buyer_name,
  buyerEmail: r.buyer_email,
  buyerUserId: r.buyer_user_id,
  qty: r.qty,
  code: r.code,
  checkedIn: r.checked_in,
  checkedInAt: r.checked_in_at,
  purchasedAt: r.purchased_at,
});

const taskToRow = (t) => ({ id: t.id, event_id: t.eventId, text: t.text, due: t.due || null, done: !!t.done });
const taskFromRow = (r) => ({ id: r.id, eventId: r.event_id, text: r.text, due: r.due, done: r.done });

const budgetToRow = (b) => ({
  id: b.id,
  event_id: b.eventId,
  category: b.category,
  item: b.item,
  est: b.est,
  actual: b.actual,
  paid: !!b.paid,
});
const budgetFromRow = (r) => ({ id: r.id, eventId: r.event_id, category: r.category, item: r.item, est: r.est, actual: r.actual, paid: r.paid });

const vendorToRow = (v) => ({
  id: v.id,
  event_id: v.eventId,
  name: v.name,
  category: v.category,
  contact: v.contact,
  cost: v.cost,
  status: v.status,
});
const vendorFromRow = (r) => ({ id: r.id, eventId: r.event_id, name: r.name, category: r.category, contact: r.contact, cost: r.cost, status: r.status });

const timelineToRow = (t) => ({ id: t.id, event_id: t.eventId, time: t.time, activity: t.activity, owner: t.owner });
const timelineFromRow = (r) => ({ id: r.id, eventId: r.event_id, time: r.time, activity: r.activity, owner: r.owner });

const submissionToRow = (s) => ({
  id: s.id,
  vendor_name: s.vendorName,
  vendor_email: s.vendorEmail,
  name: s.name,
  description: s.description || "",
  date: s.date,
  time: s.time || null,
  location: s.location,
  city: s.city || null,
  category: s.category || null,
  price: s.price,
  capacity: s.capacity,
  image_url: s.imageUrl || null,
  status: s.status,
  submitted_at: s.submittedAt || new Date().toISOString(),
  submitted_by: s.submittedBy || null,
});
const submissionFromRow = (r) => ({
  id: r.id,
  vendorName: r.vendor_name,
  vendorEmail: r.vendor_email,
  name: r.name,
  description: r.description,
  date: r.date,
  time: r.time,
  location: r.location,
  city: r.city,
  category: r.category,
  price: r.price,
  capacity: r.capacity,
  imageUrl: r.image_url,
  status: r.status,
  submittedAt: r.submitted_at,
  submittedBy: r.submitted_by,
});

const reviewToRow = (r) => ({
  id: r.id,
  event_id: r.eventId,
  user_id: r.userId,
  author_name: r.authorName,
  rating: r.rating,
  comment: r.comment || "",
  created_at: r.createdAt || new Date().toISOString(),
});
const reviewFromRow = (r) => ({
  id: r.id,
  eventId: r.event_id,
  userId: r.user_id,
  authorName: r.author_name,
  rating: r.rating,
  comment: r.comment,
  createdAt: r.created_at,
});

/**
 * Real relational data access — one table per entity, foreign keys to
 * `events`, cascading deletes handled by the database itself. Every
 * function either resolves or throws; callers decide what the UI does on
 * failure (this app shows a "couldn't save" banner via App.jsx).
 */
export const db = {
  isConfigured: configured,

  events: {
    async list() {
      const { data, error } = await requireClient().from("events").select("*").order("date", { ascending: true });
      if (error) throw error;
      return (data || []).map(eventFromRow);
    },
    async create(ev) {
      const { error } = await requireClient().from("events").insert(eventToRow(ev));
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await requireClient().from("events").delete().eq("id", id);
      if (error) throw error;
    },
  },

  tickets: {
    async list() {
      const { data, error } = await requireClient().from("tickets").select("*");
      if (error) throw error;
      return (data || []).map(ticketFromRow);
    },
    async createMany(tickets) {
      const { error } = await requireClient().from("tickets").insert(tickets.map(ticketToRow));
      if (error) throw error;
    },
    async setCheckedIn(id, checkedInAt) {
      const { error } = await requireClient().from("tickets").update({ checked_in: true, checked_in_at: checkedInAt }).eq("id", id);
      if (error) throw error;
    },
  },

  tasks: {
    async list() {
      const { data, error } = await requireClient().from("tasks").select("*");
      if (error) throw error;
      return (data || []).map(taskFromRow);
    },
    async create(t) {
      const { error } = await requireClient().from("tasks").insert(taskToRow(t));
      if (error) throw error;
    },
    async setDone(id, done) {
      const { error } = await requireClient().from("tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await requireClient().from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
  },

  budget: {
    async list() {
      const { data, error } = await requireClient().from("budget_items").select("*");
      if (error) throw error;
      return (data || []).map(budgetFromRow);
    },
    async create(b) {
      const { error } = await requireClient().from("budget_items").insert(budgetToRow(b));
      if (error) throw error;
    },
    async setPaid(id, paid) {
      const { error } = await requireClient().from("budget_items").update({ paid }).eq("id", id);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await requireClient().from("budget_items").delete().eq("id", id);
      if (error) throw error;
    },
  },

  vendors: {
    async list() {
      const { data, error } = await requireClient().from("vendors").select("*");
      if (error) throw error;
      return (data || []).map(vendorFromRow);
    },
    async create(v) {
      const { error } = await requireClient().from("vendors").insert(vendorToRow(v));
      if (error) throw error;
    },
    async setStatus(id, status) {
      const { error } = await requireClient().from("vendors").update({ status }).eq("id", id);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await requireClient().from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
  },

  timeline: {
    async list() {
      const { data, error } = await requireClient().from("timeline_items").select("*");
      if (error) throw error;
      return (data || []).map(timelineFromRow);
    },
    async create(t) {
      const { error } = await requireClient().from("timeline_items").insert(timelineToRow(t));
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await requireClient().from("timeline_items").delete().eq("id", id);
      if (error) throw error;
    },
  },

  submissions: {
    async list() {
      const { data, error } = await requireClient().from("submissions").select("*").order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(submissionFromRow);
    },
    async create(s) {
      const { error } = await requireClient().from("submissions").insert(submissionToRow(s));
      if (error) throw error;
    },
    async setStatus(id, status) {
      const { error } = await requireClient().from("submissions").update({ status }).eq("id", id);
      if (error) throw error;
    },
  },

  favorites: {
    async list(userId) {
      const { data, error } = await requireClient().from("favorites").select("event_id").eq("user_id", userId);
      if (error) throw error;
      return (data || []).map((r) => r.event_id);
    },
    async add(userId, eventId) {
      const { error } = await requireClient().from("favorites").insert({ user_id: userId, event_id: eventId });
      if (error) throw error;
    },
    async remove(userId, eventId) {
      const { error } = await requireClient().from("favorites").delete().eq("user_id", userId).eq("event_id", eventId);
      if (error) throw error;
    },
  },

  reviews: {
    async list() {
      const { data, error } = await requireClient().from("reviews").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(reviewFromRow);
    },
    async create(r) {
      const { error } = await requireClient().from("reviews").insert(reviewToRow(r));
      if (error) throw error;
    },
  },

  orders: {
    /** Creates the pending order that a payment gets attached to. */
    async createPending(order) {
      const { error } = await requireClient().from("orders").insert({
        id: order.id,
        event_id: order.eventId,
        buyer_name: order.buyerName,
        buyer_email: order.buyerEmail,
        buyer_user_id: order.buyerUserId || null,
        qty: order.qty,
        amount: order.amount,
        currency: order.currency || "GHS",
        reference: order.id,
        status: "pending",
      });
      if (error) throw error;
    },
  },

  /** Wipes every row in every table. Events cascade-delete their tickets/tasks/budget/vendors/timeline/favorites/reviews/orders. */
  async resetAll() {
    const client = requireClient();
    const { error: e1 } = await client.from("events").delete().not("id", "is", null);
    if (e1) throw e1;
    const { error: e2 } = await client.from("submissions").delete().not("id", "is", null);
    if (e2) throw e2;
  },
};
