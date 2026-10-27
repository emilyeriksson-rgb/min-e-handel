import pool from "../config/db.js";
import { createCheckoutSession } from "../integrations/stripeAdapter.js";

const normalizeEmail = (email) =>
  email.trim().toLowerCase();

const normalizeOptionalText = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const createRequestError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

export const getAllOrders = async (req, res) => {
  try {
   const result = await pool.query(`
  SELECT
    orders.id,
    orders.total_amount,
    orders.payment_status,
    orders.order_status,
    orders.created_at,

    billing_recipients.id AS billing_recipient_id,
    billing_recipients.email AS invoice_email,
    billing_recipients.name AS invoice_name,
    billing_recipients.company_name,
    billing_recipients.organization_number,
    billing_recipients.address,
    billing_recipients.postal_code,
    billing_recipients.city,

    payments.invoice_number,
    payments.invoice_status,
    payments.invoice_due_date,
    payments.paid_at

  FROM orders

  JOIN billing_recipients
    ON billing_recipients.id =
       orders.billing_recipient_id

  LEFT JOIN payments
    ON payments.order_id = orders.id

  ORDER BY orders.created_at DESC
`);

    res.json(result.rows);
  } catch (error) {
    console.error("Kunde inte hämta ordrar:", error);

    res.status(500).json({
      message: "Kunde inte hämta ordrar.",
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(
      `
        SELECT
          orders.id,
          orders.total_amount,
          orders.payment_status,
          orders.order_status,
          orders.created_at,

          billing_recipients.id
            AS billing_recipient_id,

          billing_recipients.email
            AS invoice_email,

          billing_recipients.name
            AS invoice_name,

          billing_recipients.company_name,
          billing_recipients.organization_number,
          billing_recipients.address,
          billing_recipients.postal_code,
          billing_recipients.city,

          payments.invoice_number,
payments.invoice_status,
payments.invoice_due_date,
payments.paid_at

        FROM orders

        JOIN billing_recipients
          ON billing_recipients.id =
             orders.billing_recipient_id

             LEFT JOIN payments
  ON payments.order_id = orders.id

        WHERE orders.id = $1
      `,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        message: "Ordern hittades inte.",
      });
    }

    const itemsResult = await pool.query(
      `
        SELECT
          order_items.id,
          order_items.course_session_id,
          order_items.course_title,
          order_items.price_at_purchase,
          order_items.quantity,

          course_sessions.start_date,
          course_sessions.end_date,

          locations.city,
          locations.address,

          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', participants.id,
                'email', participants.email,
                'first_name', participants.first_name,
                'last_name', participants.last_name
              )
            ) FILTER (
              WHERE participants.id IS NOT NULL
            ),
            '[]'::json
          ) AS participants

        FROM order_items

        JOIN course_sessions
          ON course_sessions.id =
             order_items.course_session_id

        LEFT JOIN locations
          ON locations.id =
             course_sessions.location_id

        LEFT JOIN enrollments
          ON enrollments.order_item_id =
             order_items.id

        LEFT JOIN participants
          ON participants.id =
             enrollments.participant_id

        WHERE order_items.order_id = $1

        GROUP BY
          order_items.id,
          course_sessions.start_date,
          course_sessions.end_date,
          locations.city,
          locations.address

        ORDER BY order_items.id
      `,
      [id]
    );

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error("Kunde inte hämta ordern:", error);

    res.status(500).json({
      message: "Kunde inte hämta ordern.",
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const orderStatus = req.body?.order_status;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const allowedStatuses = [
      "new",
      "processing",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    const result = await pool.query(
      `
        UPDATE orders AS o
        SET order_status = $1
        WHERE o.id = $2
          AND (
            NOT EXISTS (
              SELECT 1
              FROM payments p
              WHERE p.order_id = o.id
                AND p.payment_method = 'stripe'
            )
            OR (
              o.payment_status = 'paid'
              AND $1::TEXT IN ('processing', 'completed')
            )
          )
        RETURNING o.*
      `,
      [orderStatus, id]
    );

    if (result.rowCount === 0) {
      const existing = await pool.query(
        "SELECT id FROM orders WHERE id = $1",
        [id]
      );

      if (existing.rowCount === 0) {
        return res.status(404).json({
          message: "Order not found.",
        });
      }

      return res.status(409).json({
        message:
          "Unpaid Stripe orders are managed by the payment webhook. Paid Stripe orders can only be set to processing or completed.",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Could not update order status:", error);

    return res.status(500).json({
      message: "Could not update order status.",
    });
  }
};

export const createOrder = async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    const {
      billing_recipient: billingRecipient,
      items,
    } = req.body;

    if (!billingRecipient?.email) {
      throw createRequestError(
        "Fakturamottagarens email måste anges."
      );
    }

    const invoiceEmail = normalizeEmail(
      billingRecipient.email
    );

    if (!isValidEmail(invoiceEmail)) {
      throw createRequestError(
        "Fakturamottagarens email är ogiltig."
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw createRequestError(
        "Ordern måste innehålla minst en utbildning."
      );
    }

    const preparedItems = items.map((item) => {
      const courseSessionId = Number(
        item.course_session_id
      );

      if (!Number.isInteger(courseSessionId)) {
        throw createRequestError(
          "Ett ogiltigt kurstillfälle skickades."
        );
      }

      if (
        !Array.isArray(item.participants) ||
        item.participants.length === 0
      ) {
        throw createRequestError(
          "Varje utbildning måste ha minst en deltagare."
        );
      }

     const participantEmails = new Set();

const participants = item.participants.map(
  (participant) => {
    if (!participant.email) {
      throw createRequestError(
        "Deltagarens email måste anges."
      );
    }

    const participantEmail = normalizeEmail(
      participant.email
    );

    if (!isValidEmail(participantEmail)) {
      throw createRequestError(
        `Ogiltig email för deltagare: ${participant.email}`
      );
    }

    if (participantEmails.has(participantEmail)) {
      throw createRequestError(
        "Varje deltagare på samma utbildning måste ha en unik e-postadress."
      );
    }

    participantEmails.add(participantEmail);

    return {
      email: participantEmail,
      firstName: normalizeOptionalText(
        participant.first_name
      ),
      lastName: normalizeOptionalText(
        participant.last_name
      ),
    };
  }
);

return {
  courseSessionId,
  participants,
};

    });

    preparedItems.sort(
      (a, b) => a.courseSessionId - b.courseSessionId
    );

    const sessionIds = preparedItems.map(
      (item) => item.courseSessionId
    );

    if (new Set(sessionIds).size !== sessionIds.length) {
      throw createRequestError(
        "Samma kurstillfälle får bara finnas på en rad i varukorgen."
      );
    }

    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    const billingResult = await client.query(
      `
        INSERT INTO billing_recipients (
          email,
          name,
          company_name,
          organization_number,
          address,
          postal_code,
          city
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)

        ON CONFLICT (email)
        DO UPDATE SET
          name = COALESCE(
            EXCLUDED.name,
            billing_recipients.name
          ),

          company_name = COALESCE(
            EXCLUDED.company_name,
            billing_recipients.company_name
          ),

          organization_number = COALESCE(
            EXCLUDED.organization_number,
            billing_recipients.organization_number
          ),

          address = COALESCE(
            EXCLUDED.address,
            billing_recipients.address
          ),

          postal_code = COALESCE(
            EXCLUDED.postal_code,
            billing_recipients.postal_code
          ),

          city = COALESCE(
            EXCLUDED.city,
            billing_recipients.city
          )

        RETURNING id, email
      `,
      [
        invoiceEmail,
        normalizeOptionalText(billingRecipient.name),
        normalizeOptionalText(
          billingRecipient.company_name
        ),
        normalizeOptionalText(
          billingRecipient.organization_number
        ),
        normalizeOptionalText(billingRecipient.address),
        normalizeOptionalText(
          billingRecipient.postal_code
        ),
        normalizeOptionalText(billingRecipient.city),
      ]
    );

    const billingRecipientId =
      billingResult.rows[0].id;

    const orderData = [];
    let totalAmount = 0;

    for (const item of preparedItems) {
      const sessionResult = await client.query(
        `
          SELECT
            course_sessions.id,
            course_sessions.price,
            course_sessions.sale_price,
            course_sessions.is_on_sale,
            course_sessions.available_seats,
            courses.is_published,
            courses.title

          FROM course_sessions

          JOIN courses
            ON courses.id =
               course_sessions.course_id

          WHERE course_sessions.id = $1

          FOR UPDATE OF course_sessions
        `,
        [item.courseSessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw createRequestError(
          `Kurstillfälle ${item.courseSessionId} hittades inte.`,
          404
        );
      }

      const session = sessionResult.rows[0];
      const quantity = item.participants.length;

      if (!session.is_published) {
        throw createRequestError(
          "Den valda utbildningen går inte längre att boka.",
          409
        );
      }

      if (
        !Number.isInteger(session.available_seats) ||
        session.available_seats < 0
      ) {
        throw createRequestError(
          "Antalet tillgängliga platser saknas eller är ogiltigt. Kontakta oss.",
          409
        );
      }

            const reservationResult = await client.query(
        `
          SELECT COALESCE(SUM(oi.quantity), 0)::INTEGER AS reserved
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          JOIN payments p ON p.order_id = o.id
          WHERE oi.course_session_id = $1
            AND p.payment_method = 'stripe'
            AND o.payment_status = 'unpaid'
            AND o.order_status <> 'cancelled'
        `,
        [item.courseSessionId]
      );

      const reserved = reservationResult.rows[0].reserved;

      const availableToBook = Math.max(
        0,
        session.available_seats - reserved
      );

      if (quantity > availableToBook) {
        throw createRequestError(
          `Det finns bara ${availableToBook} bokningsbara platser kvar på ${session.title}.`,
          409
        );
      }

      const price =
        session.is_on_sale && session.sale_price !== null
          ? Number(session.sale_price)
          : Number(session.price);

      totalAmount += price * quantity;

      orderData.push({
        courseSessionId: item.courseSessionId,
        courseTitle: session.title,
        price,
        quantity,
        participants: item.participants,
      });
    }

    const orderResult = await client.query(
      `
        INSERT INTO orders (
          billing_recipient_id,
          total_amount,
          payment_status
        )
        VALUES ($1, $2, 'unpaid')
        RETURNING *
      `,
      [billingRecipientId, totalAmount]
    );

    const order = orderResult.rows[0];

    for (const item of orderData) {
      const orderItemResult = await client.query(
        `
          INSERT INTO order_items (
            order_id,
            course_session_id,
            course_title,
            price_at_purchase,
            quantity
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [
          order.id,
          item.courseSessionId,
          item.courseTitle,
          item.price,
          item.quantity,
        ]
      );

      const orderItemId =
        orderItemResult.rows[0].id;

      for (const participant of item.participants) {
        const participantResult = await client.query(
          `
            INSERT INTO participants (
              email,
              first_name,
              last_name
            )
            VALUES ($1, $2, $3)

            ON CONFLICT (email)
            DO UPDATE SET
              first_name = COALESCE(
                EXCLUDED.first_name,
                participants.first_name
              ),

              last_name = COALESCE(
                EXCLUDED.last_name,
                participants.last_name
              )

            RETURNING id
          `,
          [
            participant.email,
            participant.firstName,
            participant.lastName,
          ]
        );

        const participantId =
          participantResult.rows[0].id;

        await client.query(
          `
            INSERT INTO enrollments (
              order_item_id,
              participant_id
            )
            VALUES ($1, $2)

            ON CONFLICT (
              order_item_id,
              participant_id
            )
            DO NOTHING
          `,
          [orderItemId, participantId]
        );
      }
    }

await client.query(
  `
    INSERT INTO payments (
      order_id,
      payment_method,
      invoice_status
    )
    VALUES ($1, 'stripe', 'unpaid')
  `,
  [order.id]
);

// Ordern och dess rader sparas innan Stripe kontaktas.
await client.query("COMMIT");
transactionStarted = false;

const checkoutSession = await createCheckoutSession({
  orderId: order.id,
  items: orderData.map((item) => ({
    title: item.courseTitle,
    unitAmount: Math.round(item.price * 100),
    quantity: item.quantity,
  })),
});

await client.query(
  `
    UPDATE orders
    SET stripe_checkout_session_id = $1
    WHERE id = $2
  `,
  [checkoutSession.id, order.id]
);

res.status(201).json({
  message: "Ordern skapades. Fortsätt till betalningen.",
  checkout_url: checkoutSession.url,
  order: {
    id: order.id,
    total_amount: order.total_amount,
    payment_status: order.payment_status,
  },
});
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Kunde inte skapa ordern:", error);

    res.status(error.status || 500).json({
      message:
        error.status
          ? error.message
          : "Kunde inte skapa ordern.",
    });
  } finally {
    client?.release();
  }
};

export const updateInvoiceStatus = async (req, res) => {
  const allowedStatuses = [
    "unpaid",
    "paid",
    "overdue",
    "refunded",
  ];

  const { id } = req.params;
  const { invoice_status: invoiceStatus } = req.body;

  if (!allowedStatuses.includes(invoiceStatus)) {
    return res.status(400).json({
      message: "Ogiltig fakturastatus.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `UPDATE payments
      SET
        invoice_status = $1::VARCHAR,
        paid_at = CASE
          WHEN $1::VARCHAR = 'paid'
            THEN COALESCE(
              paid_at,
              CURRENT_TIMESTAMP
            )
          WHEN $1::VARCHAR = 'unpaid'
            THEN NULL
          ELSE paid_at
        END
      WHERE order_id = $2
        AND payment_method = 'invoice'
      RETURNING *`,
      [invoiceStatus, id]
    );

    if (paymentResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "Invoice status cannot be changed for this order. Stripe payments are updated by webhook only.",
      });
    }

    await client.query(
      `UPDATE orders
       SET payment_status = $1
       WHERE id = $2`,
      [invoiceStatus, id]
    );

    await client.query("COMMIT");

    res.json(paymentResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Kunde inte uppdatera fakturastatus:",
      error
    );

    res.status(500).json({
      message: "Kunde inte uppdatera fakturastatus.",
    });
  } finally {
    client.release();
  }
};