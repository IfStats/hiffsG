import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(supabaseUrl && supabaseAnonKey);

if (!configured) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing Supabase env vars — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example). The app will render, but nothing will save or authenticate until these are set."
  );
}

let client = null;
if (configured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to create Supabase client:", err);
    client = null;
  }
}

export const NOT_CONFIGURED_ERROR = new Error(
  "Supabase isn't configured yet — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment variables, then redeploy."
);

export function requireClient() {
  if (!client) throw NOT_CONFIGURED_ERROR;
  return client;
}

export const supabase = client;
