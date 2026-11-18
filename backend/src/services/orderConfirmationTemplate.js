import { z } from "zod";

const MoneySchema = z.number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);

const ItemSchema = z.object({
  title: z.string().trim().min(1).max(1000),
  quantity: z.number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER),
  unitPriceOre: MoneySchema,
}).refine(
  (item) =>
    Number.isSafeInteger(item.quantity * item.unitPriceOre),
  { message: "Ogiltigt radbelopp." }
);

const OrderEmailSchema = z.object({
  orderId: z.number().int().positive().max(2147483647),
  customerName: z.string().trim().min(1).max(300),
  items: z.array(ItemSchema).min(1).max(500),
  shippingPriceOre: MoneySchema,
  totalAmountOre: MoneySchema,
});

// Gör att kunduppgifter visas som text, inte som HTML.
function escapeHtml(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(value).replace(
    /[&<>"']/g,
    (character) => replacements[character]
  );
}

function formatMoney(ore) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
  }).format(ore / 100);
}

export function buildOrderConfirmationEmail(input) {
  const order = OrderEmailSchema.parse(input);

  const htmlRows = order.items.map((item) => {
    const lineTotalOre = item.unitPriceOre * item.quantity;

    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          ${escapeHtml(item.title)}
        </td>
        <td style="padding: 10px;">
          ${item.quantity}
        </td>
        <td style="padding: 10px;">
          ${escapeHtml(formatMoney(item.unitPriceOre))}
        </td>
        <td style="padding: 10px;">
          ${escapeHtml(formatMoney(lineTotalOre))}
        </td>
      </tr>
    `;
  }).join("");

  const textRows = order.items.map((item) => {
    const lineTotalOre = item.unitPriceOre * item.quantity;

    return (
      `${item.title}\n` +
      `Antal: ${item.quantity}\n` +
      `Styckpris: ${formatMoney(item.unitPriceOre)}\n` +
      `Radbelopp: ${formatMoney(lineTotalOre)}`
    );
  }).join("\n\n");

  const html = `
    <!doctype html>
    <html lang="sv">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Orderbekräftelse</title>
      </head>
      <body style="font-family: Arial, sans-serif; color: #17243b;">
        <div style="max-width: 640px; margin: auto; padding: 24px;">
          <h1>Tack för din beställning!</h1>

          <p>Hej ${escapeHtml(order.customerName)}!</p>

          <p>
            Vi har tagit emot betalningen för
            din beställning <strong>#${order.orderId}</strong>.
          </p>

          <h2>Din beställning</h2>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th scope="col" style="text-align: left; padding: 10px;">
                  Produkt
                </th>
                <th scope="col" style="text-align: left; padding: 10px;">
                  Antal
                </th>
                <th scope="col" style="text-align: left; padding: 10px;">
                  Styckpris
                </th>
                <th scope="col" style="text-align: left; padding: 10px;">
                  Summa
                </th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>

          <p>
            Frakt:
            ${escapeHtml(formatMoney(order.shippingPriceOre))}
          </p>

          <p>
            <strong>
              Totalt:
              ${escapeHtml(formatMoney(order.totalAmountOre))}
            </strong>
          </p>

         <p style="margin: 0 0 8px;">Vänliga hälsningar,</p>
          <img
            src="https://fsu25d-systemutveckling-uppgift-1-d.vercel.app/img/kursrum-logo.png"
            alt="Kursrum" width="150" style="display: block; width: 150px; height: auto;"
          >
        </div>
      </body>
    </html>
  `;

  const text = [
    "Tack för din beställning!",
    `Hej ${order.customerName}!`,
    `Vi har tagit emot betalningen för beställning #${order.orderId}.`,
    textRows,
    `Frakt: ${formatMoney(order.shippingPriceOre)}`,
    `Totalt: ${formatMoney(order.totalAmountOre)}`,
    "Vänliga hälsningar,\n<Kursrum>",
  ].join("\n\n");

  return { html, text };
}