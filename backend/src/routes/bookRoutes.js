import { Router } from "express";
import {
  getBooks,
  getBooksFromCsv,
} from "../integrations/bookAdapter.ts";

const router = Router();

router.get("/", async (req, res) => {
  const result = await getBooks();
  res.json(result);
});

router.get("/csv", async (req, res) => {
  const result = await getBooksFromCsv();
  res.json(result);
});

export default router;