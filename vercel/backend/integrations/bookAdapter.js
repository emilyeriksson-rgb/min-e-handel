import { z } from "zod";
import { fetchJson } from "../lib/fetchJson.js";
import { fetchText } from "../lib/fetchText.js";
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

const MAX_STOCK = 2_147_483_647;
const MAX_PRICE_ORE = 999_999_999_999;
const MAX_PRICE = MAX_PRICE_ORE / 100;

const SupplierStockText = z.string()
  .regex(
    /^\d*$/,
    "Lagersaldo måste vara ett heltal eller tomt"
  )
  .refine(
    (value) => Number(value) <= MAX_STOCK,
    `Lagersaldo måste vara ett tal högst ${MAX_STOCK}`
  );

const SupplierBook = z.object({
  artNr: z.string(),
  benamning: z.string(),
  kategori: z.string(),
  prisOre: z.int().nonnegative().max(MAX_PRICE_ORE),
  lagersaldo: z.int().nonnegative().max(MAX_STOCK).nullable(),
  varianter: z.string(),
  uppdaterad: z.iso.datetime(),
});

                                                 

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
pris: z.string()
  .regex(
    /^\d+,\d{2}$/,
    "Priset måste anges som exempelvis 499,00"
  )
  .refine(
    (value) => Number(value.replace(",", ".")) <= MAX_PRICE,
    "Priset måste vara ett tal högst 9999999999,99 kr"
  ),

lagersaldo: SupplierStockText,

  varianter: z.string(),
  uppdaterad: z.iso.date(),
});

                                                       

const SupplierXmlResponse = z.object({
  katalog: z.object({
    produkt: z.array(z.unknown()),
  }),
});

const SupplierXmlBook = z.object({
  "@_artNr": z.string().trim().min(1),
  ean: z.string(),
  benamning: z.string().trim().min(1),
  kategori: z.string().trim().min(1),
pris: z.object({
  "#text": z.string()
    .regex(
      /^\d+\.\d{2}$/,
      "Priset måste anges som exempelvis 499.00"
    )
    .refine(
      (value) => Number(value) <= MAX_PRICE,
      "Priset måste vara ett tal högst 9999999999.99 kr"
    ),
  "@_valuta": z.literal("SEK"),
}),

lagersaldo: SupplierStockText,

  varianter: z.union([
    z.literal(""),
    z.object({
      variant: z.array(z.string()).default([]),
    }),
  ]).default(""),

  uppdaterad: z.iso.datetime(),
});

                                                       

                    
              
                
                   
                
                
                     
                    
  

function toBook(book              )       {
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

function csvToBook(row                 )       {
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

function xmlToBook(row                 )       {
  const variants = typeof row.varianter === "string"
    ? []
    : row.varianter.variant;

  return {
    sku: row["@_artNr"],
    title: row.benamning,
    category: row.kategori,
    price: Number(row.pris["#text"]),
    stock: row.lagersaldo === ""
      ? 0
      : Number(row.lagersaldo),
    variants: variants
      .map((variant) => variant.trim())
      .filter(Boolean),
    updatedAt: row.uppdaterad,
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
  const books         = [];
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

async function fetchBookCsvRows()                     {
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
  const books         = [];
  const skipped                                    = [];

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

async function fetchBookXmlRows()                     {
  const baseUrl = process.env.SUPPLIER_API_URL;
  const apiKey = process.env.SUPPLIER_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Leverantörens URL eller API-nyckel saknas.");
  }

  const url = new URL(
    `${baseUrl.replace(/\/$/, "")}/export/products.xml`
  );
  url.searchParams.set("bransch", "kurslitteratur");

  const xml = await fetchText(url.toString(), {
    headers: { "X-Api-Key": apiKey },
    timeoutMs: 5000,
    encoding: "utf-8",
  });

  const parsed = xmlParser.parse(xml, true);
  const result = SupplierXmlResponse.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `XML-katalogen har fel format:\n${z.prettifyError(result.error)}`
    );
  }

  return result.data.katalog.produkt;
}

export async function getBooksFromXml() {
  const rows = await fetchBookXmlRows();
  const books         = [];
  const skipped                                    = [];

  for (const row of rows) {
    const result = SupplierXmlBook.safeParse(row);

    if (!result.success) {
      const article = z.object({
        "@_artNr": z.string(),
      }).safeParse(row);

      const problem = {
        sku: article.success
          ? article.data["@_artNr"]
          : "Okänt",
        reason: z.prettifyError(result.error),
      };

      skipped.push(problem);
      console.warn("Hoppar över kurslitteratur:", problem);
      continue;
    }

    books.push(xmlToBook(result.data));
  }

  return { books, skipped };
}