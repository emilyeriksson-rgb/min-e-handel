import pool from "../config/db.js";

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
        orders.created_at,

        billing_recipients.id AS billing_recipient_id,
        billing_recipients.email AS invoice_email,
        billing_recipients.name AS invoice_name,
        billing_recipients.company_name,
        billing_recipients.organization_number,
        billing_recipients.address,
        billing_recipients.postal_code,
        billing_recipients.city

      FROM orders

      JOIN billing_recipients
        ON billing_recipients.id =
           orders.billing_recipient_id

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
          billing_recipients.city

        FROM orders

        JOIN billing_recipients
          ON billing_recipients.id =
             orders.billing_recipient_id

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

      const uniqueParticipants = new Map();

      item.participants.forEach((participant) => {
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

        uniqueParticipants.set(participantEmail, {
          email: participantEmail,
          firstName: normalizeOptionalText(
            participant.first_name
          ),
          lastName: normalizeOptionalText(
            participant.last_name
          ),
        });
      });

      return {
        courseSessionId,
        participants: [...uniqueParticipants.values()],
      };
    });

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
            courses.title

          FROM course_sessions

          JOIN courses
            ON courses.id =
               course_sessions.course_id

          WHERE course_sessions.id = $1

          FOR UPDATE
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

      const price =
        session.is_on_sale && session.sale_price
          ? Number(session.sale_price)
          : Number(session.price);

      const quantity = item.participants.length;

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

    const invoiceNumber =
      `INV-${order.id}-${Date.now()}`;

    await client.query(
      `
        INSERT INTO payments (
          order_id,
          payment_method,
          invoice_number,
          invoice_status,
          invoice_due_date
        )
        VALUES (
          $1,
          'invoice',
          $2,
          'unpaid',
          CURRENT_DATE + 30
        )
      `,
      [order.id, invoiceNumber]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    res.status(201).json({
      message: "Ordern skapades.",
      order: {
        id: order.id,
        billing_recipient_id: billingRecipientId,
        invoice_email: invoiceEmail,
        total_amount: order.total_amount,
        payment_status: order.payment_status,
        invoice_number: invoiceNumber,
        items: orderData,
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