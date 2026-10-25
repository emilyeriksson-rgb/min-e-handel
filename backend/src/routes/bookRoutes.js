import { Router } from "express";
import { listBooks,
  updateBook,
  deleteBook,
} from "../models/bookModel.js";
import {
  getBooksFromCsv,
  getBooksFromXml,
} from "../integrations/bookAdapter.ts";
import { z } from "zod";
import {
  saveBooksToIndex,
  removeBookFromIndex,
} from "../integrations/searchAdapter.js";
import { importBooks } from "../services/bookImportService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const books = await listBooks();
    res.json({ books });
} catch (error) {
  console.error("Kunde inte lista böcker:", error);

  res.status(500).json({
    message: "Kunde inte hämta kurslitteraturen från databasen.",
  });
}
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

const BookSku = z.string().trim().min(1).max(200);

const BookInput = z.object({
  title: z.string().trim().min(1).max(500),
  category: z.string().trim().min(1).max(200),
  price: z.number()
    .nonnegative()
    .max(9999999999.99)
    .multipleOf(0.01),
  stock: z.number().int().nonnegative().max(2147483647),
  variants: z.array(
    z.string().trim().min(1).max(200)
  ).max(50),
});

async function getSearchStatus(sync) {
  try {
    await sync();

    return {
      searchIndexUpdated: true,
      searchIndexWarning: null,
    };
  } catch {
    return {
      searchIndexUpdated: false,
      searchIndexWarning:
        "Ändringen har sparats i databasen, men sökindexet kunde " +
        "inte uppdateras. Sökresultatet kan vara inaktuellt.",
    };
  }
}

router.put("/:sku", async (req, res) => {
  const sku = BookSku.safeParse(req.params.sku);
  const input = BookInput.safeParse(req.body);

  if (!sku.success || !input.success) {
    return res.status(400).json({
      message:
        "Ogiltiga bokuppgifter. Titel och kategori krävs. " +
        "Priset ska vara minst 0 med högst två decimaler, " +
        "lagersaldot ett heltal och varianterna en lista med texter.",
    });
  }

  try {
    const book = await updateBook(sku.data, input.data);

    if (!book) {
      return res.status(404).json({
        message: "Boken hittades inte.",
      });
    }

    const searchStatus = await getSearchStatus(
      () => saveBooksToIndex([book])
    );

    return res.json({
      book,
      ...searchStatus,
    });
  } catch {
    return res.status(500).json({
      message: "Kunde inte spara boken i databasen.",
    });
  }
});

router.delete("/:sku", async (req, res) => {
  const sku = BookSku.safeParse(req.params.sku);

  if (!sku.success) {
    return res.status(400).json({
      message: "Ogiltigt artikelnummer.",
    });
  }

  try {
    const book = await deleteBook(sku.data);

    if (!book) {
      return res.status(404).json({
        message: "Boken hittades inte.",
      });
    }

    const searchStatus = await getSearchStatus(
      () => removeBookFromIndex(sku.data)
    );

    return res.json({
      message: "Boken har tagits bort.",
      sku: sku.data,
      ...searchStatus,
    });
  } catch {
    return res.status(500).json({
      message: "Kunde inte ta bort boken från databasen.",
    });
  }
});

export default router;