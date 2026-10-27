import pool from "../config/db.js";
import {
  uploadProductImage,
  deleteProductImage,
} from "../integrations/storageAdapter.js";

const productTables = {
  courses: { table: "courses", key: "id" },
  books: { table: "books", key: "sku" },
};

function createError(message, status, cause) {
  const error = new Error(message, { cause });
  error.status = status;
  return error;
}

export async function replaceProductImage({
  productType,
  productId,
  buffer,
}) {
  if (!Object.hasOwn(productTables, productType)) {
    throw createError("Invalid product type.", 400);
  }

  const id = String(productId ?? "").trim();

  if (
    !id ||
    id.length > 200 ||
    (productType === "courses" &&
      (!/^[1-9]\d*$/.test(id) ||
        !Number.isSafeInteger(Number(id)) ||
        Number(id) > 2147483647))
  ) {
    throw createError("Invalid product ID.", 400);
  }

  // Tabellen och kolumnen kommer enbart från vår fasta lista.
  const { table, key } = productTables[productType];

  const existing = await pool.query(
    `SELECT ${key} FROM ${table} WHERE ${key} = $1`,
    [id]
  );

  if (existing.rowCount === 0) {
    throw createError("Product not found.", 404);
  }

  // Databasen ändras inte om uppladdningen misslyckas.
  const newImage = await uploadProductImage({
    buffer,
    productType,
  });

  let client;
  let transactionStarted = false;
  let commitAttempted = false;
  let oldImagePath;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Läs den aktuella bilden under lås.
    // Det skyddar även vid två samtidiga bildbyten.
    const current = await client.query(
      `SELECT image_path
       FROM ${table}
       WHERE ${key} = $1
       FOR UPDATE`,
      [id]
    );

    if (current.rowCount === 0) {
      throw createError("Product not found.", 404);
    }

    oldImagePath = current.rows[0].image_path;

    await client.query(
      `UPDATE ${table}
       SET image_path = $1,
           image_url = $2,
           updated_at = NOW()
       WHERE ${key} = $3`,
      [newImage.image_path, newImage.image_url, id]
    );

    commitAttempted = true;
    await client.query("COMMIT");
    transactionStarted = false;
  } catch (cause) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Image transaction rollback failed:",
          rollbackError.message
        );
      }
    }

    // Radera den nya filen om vi aldrig försökte committa.
    // Vid ett osäkert COMMIT-resultat behåller vi filen:
    // databasen kan redan ha sparat dess URL.
    if (!commitAttempted) {
      try {
        await deleteProductImage(newImage.image_path);
      } catch (cleanupError) {
        console.error(
          "Unused image cleanup failed:",
          cleanupError.message
        );
      }
    }

    if (commitAttempted) {
      throw createError(
        "The save result could not be confirmed. Refresh the product before retrying.",
        503,
        cause
      );
    }

    if (cause.status) throw cause;

    throw createError(
      "The image could not be saved. The previous image has been kept.",
      500,
      cause
    );
  } finally {
    client?.release();
  }

  let warning = null;

  // Först nu är den nya bilden sparad på produkten.
  if (oldImagePath && oldImagePath !== newImage.image_path) {
    try {
      await deleteProductImage(oldImagePath);
    } catch (error) {
      console.error(
        "Old product image cleanup failed:",
        error.message
      );

      warning =
        "The new image was saved, but the old file could not be deleted.";
    }
  }

  return {
    productType,
    productId: id,
    ...newImage,
    warning,
  };
}