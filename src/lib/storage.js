import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing Supabase env vars — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example)."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Mirrors the Claude-artifact `window.storage` API (get/set/delete/list) so
 * the rest of the app didn't need to change — it's all backed by a single
 * key/value table (`kv_store`) in Supabase instead of Claude's built-in
 * artifact storage. The `shared` argument is accepted for signature
 * compatibility but ignored: everything in this table is already global,
 * since there's no per-user auth layer in this MVP.
 */
export const storage = {
  async get(key) {
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
    const parsed = JSON.parse(value);
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value: parsed, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { key, value };
  },

  async delete(key) {
    const { error } = await supabase.from("kv_store").delete().eq("key", key);
    if (error) throw error;
    return { key, deleted: true };
  },

  async list(prefix = "") {
    const { data, error } = await supabase
      .from("kv_store")
      .select("key")
      .ilike("key", `${prefix}%`);
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key) };
  },
};
