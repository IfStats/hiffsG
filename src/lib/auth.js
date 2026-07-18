import { requireClient } from "./supabaseClient.js";

/**
 * Real Supabase Auth. A `profiles` row (id, email, display_name, role,
 * organizer_approved) is created automatically by a database trigger the
 * moment someone signs up — see supabase/phase1_auth_roles.sql.
 */
export const auth = {
  /**
   * role: 'attendee' | 'organizer'. Organizers start unapproved
   * (organizer_approved = false) until an admin approves them.
   */
  async signUp({ email, password, displayName, role }) {
    const { data, error } = await requireClient().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, role } },
    });
    if (error) throw error;
    // If email confirmation is required in the Supabase project settings,
    // data.session will be null here even though the account was created.
    return { needsEmailConfirmation: !data.session, user: data.user };
  },

  async signIn({ email, password }) {
    const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await requireClient().auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await requireClient().auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback) {
    const { data } = requireClient().auth.onAuthStateChange((_event, session) => callback(session));
    return data.subscription;
  },

  async getProfile(userId) {
    const { data, error } = await requireClient().from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Admin only (enforced by RLS): everyone waiting on organizer approval. */
  async listPendingOrganizers() {
    const { data, error } = await requireClient()
      .from("profiles")
      .select("*")
      .eq("role", "organizer")
      .eq("organizer_approved", false)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /** Admin only (enforced by RLS). */
  async approveOrganizer(userId) {
    const { error } = await requireClient().from("profiles").update({ organizer_approved: true }).eq("id", userId);
    if (error) throw error;
  },

  /** Admin only (enforced by RLS) — deny the application, back to plain attendee. */
  async rejectOrganizer(userId) {
    const { error } = await requireClient().from("profiles").update({ role: "attendee", organizer_approved: false }).eq("id", userId);
    if (error) throw error;
  },
};
