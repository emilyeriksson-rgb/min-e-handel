import { Router } from "express";
import { z } from "zod";
import { searchBooks } from "../integrations/searchAdapter.js";

const router = Router();

const SearchParams = z.object({
  q: z.string().trim().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

router.get("/", async (req, res) => {
  const result = SearchParams.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      message:
        "Ogiltiga sökparametrar. q får vara högst 200 tecken, " +
        "page ska vara ett positivt heltal och pageSize ett heltal mellan 1 och 50.",
    });
  }

  const { q, page, pageSize } = result.data;

  try {
    const response = await searchBooks({
      query: q,
      page,
      pageSize,
    });

    return res.json(response);
  } catch {
    return res.status(503).json({
      message: "Sökningen är tillfälligt otillgänglig. Försök igen senare.",
    });
  }
});

export default router;