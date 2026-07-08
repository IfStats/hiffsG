import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const configured = Boolean(supabaseUrl && supabaseAnonKey);

if (!configured) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing Supabase env vars — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment's environment variables (see .env.example). The app will render, but nothing will save until these are set."
  );
}

// Only construct the client if both values are present. Calling
// createClient with an undefined/invalid URL throws synchronously at
// import time, which would crash the whole page (blank white screen)
// before React ever mounts — so we guard it instead.
let supabase = null;
if (configured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to create Supabase client:", err);
    supabase = null;
  }
}

const NOT_CONFIGURED_ERROR = new Error(
  "Supabase isn't configured yet — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment variables, then redeploy."
);

/**
 * Mirrors the Claude-artifact `window.storage` API (get/set/delete/list) so
 * the rest of the app didn't need to change — it's all backed by a single
 * key/value table (`kv_store`) in Supabase instead of Claude's built-in
 * artifact storage. The `shared` argument is accepted for signature
 * compatibility but ignored: everything in this table is already global,
 * since there's no per-user auth layer in this MVP.
 *
 * If Supabase isn't configured (missing env vars), every method rejects
 * with a clear error instead of crashing — the app's existing try/catch
 * blocks around storage calls handle that by showing a "couldn't save"
 * banner rather than a blank page.
 */
export const storage = {
  async get(key) {
    if (!supabase) throw NOT_CONFIGURED_ERROR;
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: JSON.stringify(data.value) };
  },

  async set(key, value) {
    if (!supabase) throw NOT_CONFIGURED_ERROR;
    const parsed = JSON.parse(value);
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value: parsed, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { key, value };
  },

  async delete(key) {
    if (!supabase) throw NOT_CONFIGURED_ERROR;
    const { error } = await supabase.from("kv_store").delete().eq("key", key);
    if (error) throw error;
    return { key, deleted: true };
  },

  async list(prefix = "") {
    if (!supabase) throw NOT_CONFIGURED_ERROR;
    const { data, error } = await supabase
      .from("kv_store")
      .select("key")
      .ilike("key", `${prefix}%`);
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key) };
  },

  /** Lets the UI show a banner instead of silently failing every save. */
  isConfigured: configured,
};

