import "dotenv/config";
import { z } from "zod";

const EmailInputSchema = z.object({
  orderId: z.number().int().positive().max(2147483647),
  to: z.email().max(254),
  html: z.string().min(1).max(500000),
  text: z.string().min(1).max(200000),
}).strict();

const ConfigSchema = z.object({
  apiKey: z.string().trim().min(1).max(4096),
  from: z.string().trim().min(1).max(320)
    .refine((value) => !/[\r\n]/.test(value)),
});

const ResendResponseSchema = z.object({
  id: z.uuid(),
});

function emailError(message, code) {
  const error = new Error(message);
  error.code = code;

  return error;
}

// Dokumentation:
// https://resend.com/docs/api-reference/emails/send-email
export async function sendOrderConfirmationEmail(input) {
  const { orderId, to, html, text } =
    EmailInputSchema.parse(input);

  const config = ConfigSchema.safeParse({
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
  });

  if (!config.success) {
    throw emailError(
      "E-postinställningarna saknas eller är ogiltiga.",
      "EMAIL_CONFIG_ERROR"
    );
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${config.data.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `order-confirmation/${orderId}`,
      },
      body: JSON.stringify({
        from: config.data.from,
        to: [to],
        subject: `Orderbekräftelse #${orderId} – Kursrum`,
        html,
        text,
      }),
      signal: AbortSignal.timeout(5000),
    }
  );

  if (!response.ok) {
    throw emailError(
      "Resend kunde inte ta emot orderbekräftelsen.",
      `RESEND_HTTP_${response.status}`
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw emailError(
      "Resend skickade ett ogiltigt svar.",
      "EMAIL_INVALID_RESPONSE"
    );
  }

  const parsed = ResendResponseSchema.safeParse(data);

  if (!parsed.success) {
    throw emailError(
      "Resends svar saknar ett giltigt mejl-ID.",
      "EMAIL_INVALID_RESPONSE"
    );
  }

  return {
    emailId: parsed.data.id,
  };
}