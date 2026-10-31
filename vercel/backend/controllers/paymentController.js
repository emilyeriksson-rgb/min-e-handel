import pool from "../config/db.js";
import { verifyStripeWebhook } from "../integrations/stripeAdapter.js";

export async function stripeWebhook(req, res) {
  let event;
  try {
    event = verifyStripeWebhook(req.body, req.headers["stripe-signature"]);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.status === 400 ? "Invalid webhook signature or payload." : "Webhook configuration error." });
  }
  if (!event) return res.json({ received: true });
  const session = event.data.object;
  if (!session.client_reference_id || !/^[1-9]\d*$/.test(session.client_reference_id)) {
    return res.json({ received: true, ignored: true });
  }
  let client;
  let inTransaction = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    inTransaction = true;
    const result = await client.query(
      `SELECT o.* FROM orders o WHERE o.id = $1 FOR UPDATE`,
      [session.client_reference_id]
    );
    const order = result.rows[0];
    if (!order) throw new Error("Order not found");
    const payment = await client.query("SELECT payment_method FROM payments WHERE order_id = $1", [order.id]);
    if (payment.rows[0]?.payment_method !== "stripe") throw new Error("Not a Stripe order");
    if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id) throw new Error("Session mismatch");
    if (Math.round(Number(order.total_amount) * 100) !== session.amount_total) throw new Error("Amount mismatch");

    const inserted = await client.query(
      `INSERT INTO stripe_webhook_events (event_id, event_type, order_id)
       VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.id, event.type, order.id]
    );
    if (inserted.rowCount && order.payment_status !== "paid") {
      if (session.payment_status === "paid" &&
          ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
        const items = await client.query(
          `SELECT course_session_id, SUM(quantity)::integer AS quantity
           FROM order_items WHERE order_id = $1 GROUP BY course_session_id ORDER BY course_session_id`, [order.id]
        );

        const bookItems = await client.query(
          `SELECT
            book_id,
            SUM(quantity)::integer AS quantity
          FROM order_book_items
          WHERE order_id = $1
          GROUP BY book_id
          ORDER BY book_id`,
          [order.id]
        );

        if (!items.rows.length && !bookItems.rows.length) {
          throw new Error("Empty order");
        }

        for (const item of items.rows) {
          if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error("Invalid quantity");
          const stock = await client.query(
            `UPDATE course_sessions SET available_seats = available_seats - $1
             WHERE id = $2 AND available_seats >= $1 RETURNING id`,
            [item.quantity, item.course_session_id]
          );
          if (!stock.rowCount) throw new Error("Insufficient seats during payment confirmation");
        }
        await client.query(
          `UPDATE orders SET payment_status = 'paid', order_status = 'processing',
           stripe_checkout_session_id = $1 WHERE id = $2`, [session.id, order.id]
        );

        for (const item of bookItems.rows) {
  if (
    !Number.isInteger(item.book_id) ||
    !Number.isInteger(item.quantity) ||
    item.quantity <= 0
  ) {
    throw new Error("Invalid or deleted book in paid order");
  }

  const stock = await client.query(
    `UPDATE books
     SET
       stock = stock - $1,
       updated_at = NOW()
     WHERE id = $2
       AND stock >= $1
     RETURNING id`,
    [item.quantity, item.book_id]
  );

  if (!stock.rowCount) {
    throw new Error(
      "Insufficient book stock during payment confirmation"
    );
  }
}
        await client.query(
          `UPDATE payments SET paid_at = COALESCE(paid_at, NOW()), invoice_status = 'paid'
           WHERE order_id = $1 AND payment_method = 'stripe'`, [order.id]
        );
      } else if ((event.type === "checkout.session.expired" && session.status === "expired") ||
                 event.type === "checkout.session.async_payment_failed") {
        await client.query(
          `UPDATE orders SET order_status = 'cancelled', stripe_checkout_session_id = $1
           WHERE id = $2 AND payment_status <> 'paid'`, [session.id, order.id]
        );
      }
    }
    await client.query("COMMIT");
    inTransaction = false;
    return res.json({ received: true });
  } catch (error) {
    if (client && inTransaction) await client.query("ROLLBACK");
    console.error("Stripe webhook processing failed:", error.message);
    return res.status(500).json({ message: "Webhook processing failed. Retry required." });
  } finally {
    client?.release();
  }
}

export async function getPaymentConfirmation(req, res) {
  res.set("Cache-Control", "no-store");
  const sessionId = req.query.session_id;
  if (typeof sessionId !== "string" || !/^cs_test_[A-Za-z0-9]+$/.test(sessionId) || sessionId.length > 255) {
    return res.status(400).json({ message: "Ogiltig betalningsreferens." });
  }
  try {
    const result = await pool.query(
          `SELECT
        id,
        total_amount,
        payment_status,
        order_status,
        shipping_method,
        shipping_price,
        shipping_address,
        shipping_service_point,
        shipping_estimate
      FROM orders
      WHERE stripe_checkout_session_id = $1`,
      [sessionId]
      );
    if (!result.rows.length) return res.status(404).json({ message: "Ordern är inte tillgänglig ännu. Vänta ett ögonblick." });
    const order = result.rows[0];
    const items = await pool.query(
        `SELECT
      'course' AS product_type,
      id,
      course_title AS title,
      price_at_purchase,
      quantity
    FROM order_items
    WHERE order_id = $1

    UNION ALL

    SELECT
      'book' AS product_type,
      id,
      book_title AS title,
      price_at_purchase,
      quantity
    FROM order_book_items
    WHERE order_id = $1

    ORDER BY product_type, id`,
    [order.id]
    );
    return res.json({ ...order, items: items.rows });
  } catch {
    return res.status(500).json({ message: "Kunde inte hämta orderstatus. Försök igen." });
  }
}
