import { Router } from "express";
import { z } from "zod";
import { searchBooks } from "../integrations/searchAdapter.js";
import pool from "../config/db.js";

const router = Router();

const PriceParam = z.string()
  .trim()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    "Priset ska vara ett positivt tal eller noll med högst två decimaler."
  )
  .transform(Number)
  .pipe(z.number().nonnegative().max(9999999999.99));

const SearchParams = z.object({
  q: z.string().trim().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(["all", "course", "book"]).default("all"),
  sort: z.enum(["relevance", "price_asc", "price_desc"]).default("relevance"),
  category: z.string().trim().max(200).default(""),
  minPrice: PriceParam.optional(),
  maxPrice: PriceParam.optional(),
  learningFormat: z.enum([
    "",
    "online",
    "onsite",
    "hybrid",
  ]).default(""),

  studyPace: z.enum([
    "",
    "eget tempo",
    "heltid",
    "deltid",
  ]).default(""),

  city: z.string().trim().max(100).default(""),

})
.refine(
  ({ minPrice, maxPrice }) =>
    minPrice === undefined ||
    maxPrice === undefined ||
    minPrice <= maxPrice,
  {
    message: "Minpriset får inte vara högre än maxpriset.",
    path: ["minPrice"],
  }
);

router.get("/", async (req, res) => {
  const result = SearchParams.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      message: "Ogiltiga sökparametrar.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const { q, ...params } = result.data;

  try {
  const response = await searchBooks({
  query: q,
  ...params,
});

if (response.products.length > 0) {
  const bookSkus = response.products
    .filter((product) => product.type === "book")
    .map((product) => product.sku);

  const courseIds = response.products
    .filter((product) => product.type === "course")
    .map((product) => product.id);

  const imageResult = await pool.query(
    `
      SELECT
        'book' AS type,
        sku AS product_key,
        image_url
      FROM books
      WHERE sku = ANY($1::TEXT[])

      UNION ALL

      SELECT
        'course' AS type,
        id::TEXT AS product_key,
        image_url
      FROM courses
      WHERE id = ANY($2::INTEGER[])
    `,
    [bookSkus, courseIds]
  );

  const images = new Map(
    imageResult.rows.map((row) => [
      `${row.type}:${row.product_key}`,
      row.image_url,
    ])
  );

  response.products = response.products.map((product) => {
    const key = product.type === "book"
      ? `book:${product.sku}`
      : `course:${product.id}`;

    return {
      ...product,
      image_url: images.has(key)
        ? images.get(key)
        : product.image_url ?? null,
      };
    });
  }

  return res.json(response);

  } catch {
    return res.status(503).json({
      message:
        "Sökningen är tillfälligt otillgänglig. Försök igen senare.",
    });
  }
});

export default router;