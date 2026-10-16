import pool from "../config/db.js";
import { upsertBook } from "../models/bookModel.js";
import {
  getBooksFromCsv,
  getBooksFromXml,
} from "../integrations/bookAdapter.js";

export async function importBooks(format) {
  if (format !== "csv" && format !== "xml") {
    throw new Error("Importformatet måste vara csv eller xml.");
  }

  const { books, skipped } = format === "csv"
    ? await getBooksFromCsv()
    : await getBooksFromXml();

  const client = await pool.connect();

  let created = 0;
  let updated = 0;

  try {
    await client.query("BEGIN");

    for (const book of books) {
      const result = await upsertBook(book, client);

      if (result === "created") {
        created++;
      } else {
        updated++;
      }
    }

    await client.query("COMMIT");

    return {
      created,
      updated,
      skippedCount: skipped.length,
      skipped,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}