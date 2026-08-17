import pool from '../config/db.js';

export const getAllOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        user_id,
        customer_email,
        total_amount,
        payment_status,
        created_at
       FROM orders
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
    } catch (error) {
    console.error('Kunde inte hämta ordrar:', error);
    res.status(500).json({ error: 'Inte möjligt att hämta ordrar' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    /* Hämta orderinformation */
    const orderResult = await pool.query(
      `SELECT
        id,
        user_id,
        customer_email,
        total_amount,
        payment_status,
        created_at
       FROM orders
       WHERE id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        message: "Ordern hittades inte.",
      });
    }

    const itemsResult = await pool.query(
      `SELECT
        order_items.id,
        order_items.course_session_id,
        order_items.course_title,
        order_items.price_at_purchase,
        order_items.quantity,
        course_sessions.start_date,
        course_sessions.end_date,
        course_sessions.location_type,
        course_sessions.is_self_paced
       FROM order_items
       JOIN course_sessions
         ON order_items.course_session_id = course_sessions.id
       WHERE order_items.order_id = $1
       ORDER BY order_items.id`,
      [id]
    );

    const paymentResult = await pool.query(
      `SELECT
        payment_method,
        invoice_number,
        invoice_status,
        invoice_due_date,
        paid_at,
        created_at
       FROM payments
       WHERE order_id = $1`,
      [id]
    );

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
      payment: paymentResult.rows[0] || null,
    });
  } catch (error) {
    console.error("Kunde inte hämta ordern:", error);

    res.status(500).json({
      message: "Kunde inte hämta ordern.",
    });
  }
};

/* skapa ny order och faktura */
export const createOrder = async (req, res) => {
  const { customer_email, items } = req.body;

  if (!customer_email) {
    return res.status(400).json({
      message: "Kundens e-postadress måste anges.",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Ordern måste innehålla minst en vara.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        const error = new Error(
          "Antalet måste vara ett positivt heltal."
        );

        error.statusCode = 400;
        throw error;
      }

      const courseResult = await client.query(
        `SELECT
          course_sessions.id AS course_session_id,
          courses.title,
          CASE
            WHEN courses.is_on_sale = true
              AND courses.sale_price IS NOT NULL
            THEN courses.sale_price
            ELSE courses.price
          END AS current_price
         FROM course_sessions
         JOIN courses
           ON course_sessions.course_id = courses.id
         WHERE course_sessions.id = $1`,
        [item.course_session_id]
      );

      if (courseResult.rows.length === 0) {
        const error = new Error(
          `Kurstillfälle ${item.course_session_id} finns inte.`
        );

        error.statusCode = 400;
        throw error;
      }

      const course = courseResult.rows[0];
      const price = Number(course.current_price);

      totalAmount += price * quantity;

      validatedItems.push({
        course_session_id: course.course_session_id,
        course_title: course.title,
        price_at_purchase: price,
        quantity,
      });
    }

    const orderResult = await client.query(
      `INSERT INTO orders (
        customer_email,
        total_amount,
        payment_status
      )
      VALUES ($1, $2, $3)
      RETURNING *`,
      [customer_email, totalAmount, "unpaid"]
    );

    const order = orderResult.rows[0];
    const createdItems = [];

    for (const item of validatedItems) {
      const itemResult = await client.query(
        `INSERT INTO order_items (
          order_id,
          course_session_id,
          course_title,
          price_at_purchase,
          quantity
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          order.id,
          item.course_session_id,
          item.course_title,
          item.price_at_purchase,
          item.quantity,
        ]
      );

      createdItems.push(itemResult.rows[0]);
    }

    const invoiceNumber = `INV-${order.id}-${Date.now()}`;

    const paymentResult = await client.query(
      `INSERT INTO payments (
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
        CURRENT_DATE + INTERVAL '30 days'
      )
      RETURNING *`,
      [order.id, invoiceNumber]
    );

    await client.query("COMMIT");

    res.status(201).json({
      order,
      items: createdItems,
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Kunde inte skapa ordern:", error);

    res.status(error.statusCode || 500).json({
      message: error.message || "Kunde inte skapa ordern.",
    });
  } finally {
    client.release();
  }
};