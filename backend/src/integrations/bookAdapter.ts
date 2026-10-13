import { z } from "zod";
import { fetchJson } from "../lib/fetchJson.ts";
import { fetchText } from "../lib/fetchText.ts";
import { parse } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  parseAttributeValue: false,

  isArray: (_name, path) =>
    path === "katalog.produkt" ||
    path === "katalog.produkt.varianter.variant",
});

const SupplierBook = z.object({
  artNr: z.string(),
  benamning: z.string(),
  kategori: z.string(),
  prisOre: z.int().nonnegative(),
  lagersaldo: z.int().nonnegative().nullable(),
  varianter: z.string(),
  uppdaterad: z.iso.datetime(),
});

type SupplierBook = z.infer<typeof SupplierBook>;

const SupplierResponse = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    totalPages: z.int().nonnegative(),
  }),
});

const SupplierCsvBook = z.object({
  artNr: z.string().trim().min(1),
  ean: z.string(),
  benamning: z.string().trim().min(1),
  kategori: z.string().trim().min(1),

  pris: z.string().regex(
    /^\d+,\d{2}$/,
    "Priset måste anges som exempelvis 499,00"
  ),

  lagersaldo: z.string().regex(
    /^\d*$/,
    "Lagersaldo måste vara ett heltal eller tomt"
  ),

  varianter: z.string(),
  uppdaterad: z.iso.date(),
});

type SupplierCsvBook = z.infer<typeof SupplierCsvBook>;

export type Book = {
  sku: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  variants: string[];
  updatedAt: string;
};

function toBook(book: SupplierBook): Book {
  return {
    sku: book.artNr,
    title: book.benamning,
    category: book.kategori,
    price: book.prisOre / 100,
    stock: book.lagersaldo ?? 0,
    variants: book.varianter
      .split(",")
      .map((variant) => variant.trim())
      .filter(Boolean),
    updatedAt: book.uppdaterad,
  };
}

function csvToBook(row: SupplierCsvBook): Book {
  return {
    sku: row.artNr,
    title: row.benamning,
    category: row.kategori,
    price: Number(row.pris.replace(",", ".")),
    stock: row.lagersaldo === ""
      ? 0
      : Number(row.lagersaldo),
    variants: row.varianter
      .split("|")
      .map((variant) => variant.trim())
      .filter(Boolean),
    updatedAt: `${row.uppdaterad}T00:00:00.000Z`,
  };
}

async function fetchBookPage(page = 1) {
  const baseUrl = process.env.SUPPLIER_API_URL;
  const apiKey = process.env.SUPPLIER_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Leverantörens URL eller API-nyckel saknas.");
  }

  const url = new URL(`${baseUrl.replace(/\/$/, "")}/products`);
  url.searchParams.set("bransch", "kurslitteratur");
  url.searchParams.set("pageSize", "45");
  url.searchParams.set("page", String(page));

  return fetchJson(url.toString(), {
    headers: { "X-Api-Key": apiKey },
    timeoutMs: 5000,
  });
}

export async function getBooks() {
  const books: Book[] = [];
  let skippedCount = 0;
  let totalPages = 1;

  for (let page = 1; page <= totalPages; page++) {
    const raw = await fetchBookPage(page);
    const response = SupplierResponse.safeParse(raw);

    if (!response.success) {
      throw new Error(
        `Leverantörens svar har fel format:\n${z.prettifyError(response.error)}`
      );
    }

    if (page === 1) {
      totalPages = response.data.meta.totalPages;
    }

    for (const rawBook of response.data.data) {
      const result = SupplierBook.safeParse(rawBook);

      if (!result.success) {
        skippedCount++;
        console.warn(
          "Hoppar över felaktig kurslitteratur:",
          z.prettifyError(result.error)
        );
        continue;
      }

      books.push(toBook(result.data));
    }
  }

  return { books, skippedCount };
}

async function fetchBookCsvRows(): Promise<unknown[]> {
  const baseUrl = process.env.SUPPLIER_API_URL;
  const apiKey = process.env.SUPPLIER_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Leverantörens URL eller API-nyckel saknas.");
  }

  const url = new URL(
    `${baseUrl.replace(/\/$/, "")}/export/products.csv`
  );
  url.searchParams.set("bransch", "kurslitteratur");

  const csv = await fetchText(url.toString(), {
    headers: { "X-Api-Key": apiKey },
    timeoutMs: 5000,
    encoding: "windows-1252",
  });

  return parse(csv, {
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

export async function getBooksFromCsv() {
  const rows = await fetchBookCsvRows();
  const books: Book[] = [];
  const skipped: { sku: string; reason: string }[] = [];

  for (const row of rows) {
    const result = SupplierCsvBook.safeParse(row);

    if (!result.success) {
      const article = z.object({
        artNr: z.string(),
      }).safeParse(row);

      const problem = {
        sku: article.success ? article.data.artNr : "Okänt",
        reason: z.prettifyError(result.error),
      };

      skipped.push(problem);
      console.warn("Hoppar över kurslitteratur:", problem);
      continue;
    }

    books.push(csvToBook(result.data));
  }

  return { books, skipped };
}