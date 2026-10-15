import pool from "../config/db.js";

export async function upsertBook(book, db = pool) {
  const values = [
    book.sku,
    book.title,
    book.category,
    book.price,
    book.stock,
    book.variants,
    book.updatedAt,
  ];

  const inserted = await db.query(
    `INSERT INTO books
       (sku, title, category, price, stock, variants, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (sku) DO NOTHING
     RETURNING id`,
    values
  );

  if (inserted.rowCount === 1) {
    return "created";
  }

  const updated = await db.query(
    `UPDATE books
     SET title = $2,
         category = $3,
         price = $4,
         stock = $5,
         variants = $6,
         updated_at = $7
     WHERE sku = $1
     RETURNING id`,
    values
  );

  if (updated.rowCount !== 1) {
    throw new Error(`Kunde inte uppdatera boken ${book.sku}`);
  }

  return "updated";
}