import { z } from "zod";
import pool from "../config/db.js";
import {
  calculateShippingPrice,
} from "../services/shippingService.js";

const QuoteInputSchema = z.object({
  items: z.array(
    z.object({
      course_session_id: z.number().int().positive(),
      quantity: z.number().int().min(1).max(999),
    }).strict()
  ).max(99).default([]),

  books: z.array(
    z.object({
      sku: z.string().trim().min(1).max(200),
      quantity: z.number().int().min(1).max(99),
    }).strict()
  ).max(99).default([]),
}).strict();

function quoteError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function calculateSubtotal(requestedItems, rows, keyField) {
  const products = new Map(
    rows.map((row) => [row.product_key, row])
  );

  let subtotalOre = 0;

  for (const item of requestedItems) {
    const product = products.get(String(item[keyField]));

    if (!product) {
      throw quoteError(
        "En produkt finns inte längre eller går inte att köpa.",
        409
      );
    }

    const unitAmount = Math.round(
      Number(product.price) * 100
    );

    if (
      !Number.isSafeInteger(unitAmount) ||
      unitAmount < 0
    ) {
      throw new Error("Invalid database price");
    }

    subtotalOre += unitAmount * item.quantity;
  }

  return subtotalOre;
}

export async function getShippingQuote(req, res) {
  res.set("Cache-Control", "no-store");

  const parsed = QuoteInputSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Varukorgen innehåller ogiltiga produktrader.",
    });
  }

  const { items, books } = parsed.data;

  const courseIds = items.map(
    (item) => item.course_session_id
  );

  const bookSkus = books.map((book) => book.sku);

  if (
    items.length + books.length === 0 ||
    items.length + books.length > 99 ||
    new Set(courseIds).size !== courseIds.length ||
    new Set(bookSkus).size !== bookSkus.length
  ) {
    return res.status(400).json({
      message:
        "Varukorgen är tom, innehåller dubbletter eller har för många produktrader.",
    });
  }

  try {
    const [courseResult, bookResult] = await Promise.all([
      pool.query(
        `SELECT
           cs.id::TEXT AS product_key,
           CASE
             WHEN cs.is_on_sale
               AND cs.sale_price IS NOT NULL
             THEN cs.sale_price
             ELSE cs.price
           END AS price
         FROM course_sessions cs
         JOIN courses c ON c.id = cs.course_id
         WHERE cs.id = ANY($1::INTEGER[])
           AND c.is_published = TRUE`,
        [courseIds]
      ),

      pool.query(
        `SELECT
           sku AS product_key,
           price
         FROM books
         WHERE sku = ANY($1::TEXT[])`,
        [bookSkus]
      ),
    ]);

    const courseSubtotalOre = calculateSubtotal(
      items,
      courseResult.rows,
      "course_session_id"
    );

    const bookSubtotalOre = calculateSubtotal(
      books,
      bookResult.rows,
      "sku"
    );

    const itemsSubtotalOre =
      courseSubtotalOre + bookSubtotalOre;

    const hasBooks = books.length > 0;

    const methods = hasBooks
      ? ["service_point", "home"]
      : ["none"];

    const shippingOptions = methods.map((method) => {
      const priceOre = calculateShippingPrice({
        method,
        bookSubtotalOre,
        hasBooks,
      });

      return {
        method,
        priceOre,
        totalOre: itemsSubtotalOre + priceOre,
      };
    });

    if (
      shippingOptions.some((option) =>
        !Number.isSafeInteger(option.totalOre) ||
        option.totalOre < 300 ||
        option.totalOre > 99999999
      )
    ) {
      throw quoteError(
        "Orderbeloppet måste vara mellan 3 och 999 999,99 kronor."
      );
    }

    return res.json({
      currency: "SEK",
      hasBooks,
      courseSubtotalOre,
      bookSubtotalOre,
      itemsSubtotalOre,
      shippingOptions,
    });
  } catch (error) {
    const status = [400, 409].includes(error.status)
      ? error.status
      : 500;

    return res.status(status).json({
      message: status === 500
        ? "Kunde inte beräkna varukorgens pris. Försök igen."
        : error.message,
    });
  }
}