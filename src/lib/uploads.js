import { requireClient } from "./supabaseClient.js";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function randomName(originalName) {
  const ext = (originalName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return `${rand}.${ext}`;
}

export const uploads = {
  /**
   * Uploads a File to the public `event-images` bucket and returns its
   * public URL. Throws with a friendly message on validation failure or
   * upload error (including when storage/RLS isn't set up yet — see
   * supabase/phase2c_event_images.sql).
   */
  async uploadEventImage(file) {
    if (!file) throw new Error("No file selected.");
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Please choose a JPG, PNG, WEBP, or GIF image.");
    }
    if (file.size > MAX_BYTES) {
      throw new Error("Image is too large — please choose one under 5MB.");
    }
    const client = requireClient();
    const path = randomName(file.name);
    const { error: uploadError } = await client.storage.from("event-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (uploadError) throw uploadError;
    const { data } = client.storage.from("event-images").getPublicUrl(path);
    return data.publicUrl;
  },
};
