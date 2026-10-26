import { Router } from "express";
import { z } from "zod";
import { searchBooks } from "../integrations/searchAdapter.js";

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

    return res.json(response);
  } catch {
    return res.status(503).json({
      message:
        "Sökningen är tillfälligt otillgänglig. Försök igen senare.",
    });
  }
});

export default router;