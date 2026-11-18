import pool from "../config/db.js";
import {
  buildOrderConfirmationEmail,
} from "./orderConfirmationTemplate.js";
import {
  sendOrderConfirmationEmail,
} from "../integrations/emailAdapter.js";

export async function prepareOrderConfirmation(orderId) {
  const result = await pool.query(
    `SELECT
       o.id,
       o.total_amount,
       o.shipping_price,
       br.email,
       br.name,
       br.company_name
     FROM orders o
     JOIN billing_recipients br
       ON br.id = o.billing_recipient_id
     WHERE o.id = $1
       AND o.payment_status = 'paid'`,
    [orderId]
  );

  const order = result.rows[0];

  if (!order) {
    throw new Error(
      "Paid order or billing recipient not found."
    );
  }

  const itemsResult = await pool.query(
    `SELECT
       'course' AS product_type,
       id,
       course_title AS title,
       quantity,
       price_at_purchase
     FROM order_items
     WHERE order_id = $1

     UNION ALL

     SELECT
       'book' AS product_type,
       id,
       book_title AS title,
       quantity,
       price_at_purchase
     FROM order_book_items
     WHERE order_id = $1

     ORDER BY product_type, id`,
    [order.id]
  );

  const { html, text } = buildOrderConfirmationEmail({
    orderId: order.id,
    customerName:
      order.name?.trim() ||
      order.company_name?.trim() ||
      "kund",
    items: itemsResult.rows.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unitPriceOre: Math.round(
        Number(item.price_at_purchase) * 100
      ),
    })),
    shippingPriceOre: Math.round(
      Number(order.shipping_price) * 100
    ),
    totalAmountOre: Math.round(
      Number(order.total_amount) * 100
    ),
  });

  return {
    orderId: order.id,
    to: order.email,
    html,
    text,
  };
}

export async function sendOrderConfirmation(orderId) {

  // Bara ett anrop får ta hand om utskicket för ordern.
  const claimed = await pool.query(
    `INSERT INTO order_confirmation_emails (
       order_id,
       status,
       attempted_at
     )
      SELECT id, 'sending', NOW()
     FROM orders
     WHERE id = $1 AND payment_status = 'paid'

     ON CONFLICT (order_id)
     DO UPDATE SET
       status = 'sending',
       attempted_at = NOW(),
       last_error_code = NULL
     WHERE order_confirmation_emails.status = 'pending'

     RETURNING order_id`,
    [orderId]
  );

  if (!claimed.rowCount) {
    return;
  }

  let email;
  let accepted = false;

  try {
    email = await prepareOrderConfirmation(orderId);
    const { emailId } = await sendOrderConfirmationEmail(email);

    accepted = true;

    await pool.query(
      `UPDATE order_confirmation_emails
       SET
         status = 'sent',
         resend_email_id = $2,
         sent_at = NOW(),
         last_error_code = NULL
       WHERE order_id = $1`,
      [orderId, emailId]
    );
  } catch (error) {
    // Logga inte mottagare, mejlinnehåll eller API-nyckel.
    let errorCode = "EMAIL_SEND_ERROR";

    if (accepted) {
      errorCode = "EMAIL_TRACKING_ERROR";
    } else if (!email) {
      errorCode = "EMAIL_PREPARATION_ERROR";
    } else if (
      typeof error.code === "string" &&
      /^(EMAIL_[A-Z_]+|RESEND_HTTP_\d{3})$/.test(error.code)
    ) {
      errorCode = error.code;
    } else if (error.name === "TimeoutError") {
      errorCode = "EMAIL_TIMEOUT";
    }

    if (!accepted) {
      try {
        await pool.query(
          `UPDATE order_confirmation_emails
           SET
             status = 'failed',
             last_error_code = $2
           WHERE order_id = $1`,
          [orderId, errorCode]
        );
      } catch {
        console.error(
          "Could not save email failure:",
          { orderId }
        );
      }
    }

    const failure = new Error(
      "Order confirmation could not be completed."
    );
    failure.code = errorCode;
    throw failure;
  }
}