import "dotenv/config";
import Stripe from "stripe";
import { z } from "zod";

let stripeClient;
export function getStripeClient() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key?.startsWith("sk_test_")) throw new Error("STRIPE_SECRET_KEY saknas eller är inte en testnyckel.");
  stripeClient = new Stripe(key, { timeout: 10000, maxNetworkRetries: 0 });
  return stripeClient;
}

const checkoutInput = z.object({
  orderId: z.number().int().positive(),
  items: z.array(z.object({
    title: z.string().min(1),
    unitAmount: z.number().int().nonnegative().max(99999999),
    quantity: z.number().int().positive().max(999),
  })).min(1).max(100),
});
const sessionSchema = z.object({
  id: z.string().startsWith("cs_test_"),
  url: z.string().url().refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com";
  }),
  client_reference_id: z.string(),
  currency: z.literal("sek"),
  amount_total: z.number().int().nonnegative(),
});
export async function createCheckoutSession(input) {
  const { orderId, items } = checkoutInput.parse(input);
  const base = new URL(process.env.FRONTEND_URL).origin;
  const expectedTotal = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
  if (!Number.isSafeInteger(expectedTotal) || expectedTotal < 300 || expectedTotal > 99999999) {
    const error = new Error("Orderbeloppet måste vara mellan 3 och 999 999,99 kronor.");
    error.status = 400;
    throw error;
  }
  try {
    const response = await getStripeClient().checkout.sessions.create({
      mode: "payment", ui_mode: "hosted_page", locale: "sv",
      client_reference_id: String(orderId),
      line_items: items.map(item => ({
        price_data: { currency: "sek", product_data: { name: item.title }, unit_amount: item.unitAmount },
        quantity: item.quantity,
      })),
      success_url: `${base}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout?cancelled=1`,
    }, { idempotencyKey: `checkout-order-${orderId}` });
    const session = sessionSchema.parse(response);
    if (session.client_reference_id !== String(orderId) || session.amount_total !== expectedTotal) {
      throw new Error("Stripe-sessionen matchar inte ordern.");
    }
    return { id: session.id, url: session.url };
  } catch (cause) {
    const error = new Error("Betalningen kunde inte startas. Din order är fortfarande obetald.", { cause });
    error.status = 503;
    throw error;
  }
}

const supportedTypes = new Set([
  "checkout.session.completed", "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed", "checkout.session.expired",
]);
const webhookSchema = z.object({
  id: z.string().startsWith("evt_"),
  type: z.string(),
  livemode: z.literal(false),
  data: z.object({ object: z.object({
    id: z.string().startsWith("cs_test_"),
    client_reference_id: z.string().nullable(),
    payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
    status: z.enum(["open", "complete", "expired"]),
    amount_total: z.number().int().nonnegative(),
    currency: z.literal("sek"),
  }) }),
});
export function verifyStripeWebhook(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET saknas.");
  try {
    if (!Buffer.isBuffer(rawBody) || typeof signature !== "string") throw new Error("Missing signature or raw body");
    const event = getStripeClient().webhooks.constructEvent(rawBody, signature, secret);
    if (!supportedTypes.has(event.type)) return null;
    return webhookSchema.parse(event);
  } catch (cause) {
    const error = new Error("Invalid Stripe webhook.", { cause });
    error.status = 400;
    throw error;
  }
}
