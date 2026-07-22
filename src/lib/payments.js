import { requireClient } from "./supabaseClient.js";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const existing = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Paystack.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paystack."));
    document.head.appendChild(script);
  });
}

export const payments = {
  isConfigured: Boolean(PAYSTACK_PUBLIC_KEY),

  /**
   * Creates a pending order row, opens the Paystack popup, and on success
   * asks the verify-payment Edge Function (server-side) to confirm the
   * charge and issue tickets. Never trusts the popup's own "success"
   * callback as proof of payment — that's just the cue to go verify.
   *
   * order: { id, eventId, buyerName, buyerEmail, buyerUserId, qty, amount, currency }
   * Resolves with the array of issued tickets, or rejects with an Error.
   */
  async payAndIssueTickets(order) {
    if (!PAYSTACK_PUBLIC_KEY) {
      throw new Error("Payments aren't configured yet — set VITE_PAYSTACK_PUBLIC_KEY.");
    }
    await loadPaystackScript();

    return new Promise((resolve, reject) => {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: order.buyerEmail,
        amount: Math.round(order.amount * 100), // Paystack wants the smallest currency unit
        currency: order.currency || "GHS",
        ref: order.id,
        metadata: { eventId: order.eventId, buyerName: order.buyerName, qty: order.qty },
        callback: (response) => {
          requireClient()
            .functions.invoke("verify-payment", { body: { reference: response.reference } })
            .then(({ data, error }) => {
              if (error) return reject(new Error(error.message || "Payment verification failed."));
              if (data?.error) return reject(new Error(data.error));
              resolve(data.tickets || []);
            })
            .catch((err) => reject(err));
        },
        onClose: () => reject(new Error("Payment window closed before completing.")),
      });
      handler.openIframe();
    });
  },
};
