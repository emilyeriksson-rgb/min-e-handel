import { Router } from "express";
import {
  getBooks,
  getBooksFromCsv,
  getBooksFromXml,
} from "../integrations/bookAdapter.ts";
import { importBooks } from "../services/bookImportService.js";

const router = Router();

router.get("/", async (req, res) => {
  const result = await getBooks();
  res.json(result);
});

router.get("/csv", async (req, res) => {
  const result = await getBooksFromCsv();
  res.json(result);
});

router.get("/xml", async (req, res) => {
  const result = await getBooksFromXml();
  res.json(result);
});

router.post("/import/csv", async (req, res) => {
  const report = await importBooks("csv");
  res.json(report);
});

router.post("/import/xml", async (req, res) => {
  const report = await importBooks("xml");
  res.json(report);
});

export default router;