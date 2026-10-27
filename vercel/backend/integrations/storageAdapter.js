import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const configSchema = z.object({
  url: z.string().url().refine(
    (value) => new URL(value).protocol === "https:"
  ),
  key: z.string().startsWith("sb_secret_"),
  bucket: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
});

const imagePathSchema = z.string().regex(
  /^(courses|books)\/[a-f0-9-]{36}\.(jpg|png)$/
);

let storage;
let config;

function createError(message, status, cause) {
  const error = new Error(message, { cause });
  error.status = status;
  return error;
}

function getStorage() {
  if (storage) return storage;

  const parsed = configSchema.safeParse({
    url: process.env.SUPABASE_URL?.trim(),
    key: process.env.SUPABASE_SECRET_KEY?.trim(),
    bucket: process.env.SUPABASE_STORAGE_BUCKET?.trim(),
  });

  if (!parsed.success) {
    throw createError(
      "Image storage is not configured correctly.",
      503
    );
  }

  config = parsed.data;

  const client = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, options = {}) => {
        const signals = [
          AbortSignal.timeout(10_000),
        ];

        if (options.signal) {
          signals.push(options.signal);
        }

        return fetch(input, {
          ...options,
          signal: AbortSignal.any(signals),
        });
      },
    },
  });

  storage = client.storage.from(config.bucket);
  return storage;
}

export async function uploadProductImage({
  buffer,
  productType,
}) {
  if (!["courses", "books"].includes(productType)) {
    throw createError("Invalid product type.", 400);
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw createError("Please select an image.", 400);
  }

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw createError(
      "The image must be 2 MB or smaller.",
      400
    );
  }

  let detected;

  try {
    detected = await fileTypeFromBuffer(buffer);
  } catch {
    throw createError(
      "The file could not be read. Use a JPEG or PNG image.",
      400
    );
  }

  if (
    !detected ||
    !["image/jpeg", "image/png"].includes(detected.mime)
  ) {
    throw createError(
      "Only JPEG and PNG images are allowed.",
      400
    );
  }

  const extension =
    detected.mime === "image/jpeg" ? "jpg" : "png";

  const imagePath =
    `${productType}/${randomUUID()}.${extension}`;

  const bucket = getStorage();

  try {
    const { data, error } = await bucket.upload(
      imagePath,
      buffer,
      {
        contentType: detected.mime,
        cacheControl: "3600",
        upsert: false,
      }
    );

    if (error) throw error;

    const uploaded = z.object({
      path: imagePathSchema,
    }).parse(data);

    if (uploaded.path !== imagePath) {
      throw new Error("Unexpected uploaded image path.");
    }

    const { data: publicData } =
      bucket.getPublicUrl(imagePath);

    const imageUrl = z.string().url().parse(
      publicData?.publicUrl
    );

    const expectedUrl =
      `${new URL(config.url).origin}` +
      `/storage/v1/object/public/${config.bucket}/${imagePath}`;

    if (imageUrl !== expectedUrl) {
      throw new Error("Unexpected public image URL.");
    }

    return {
      image_path: imagePath,
      image_url: imageUrl,
    };
  } catch (cause) {
    throw createError(
      "Image upload failed. The product image has not been changed.",
      503,
      cause
    );
  }
}

export async function deleteProductImage(imagePath) {
  if (!imagePath) return;

  const parsed = imagePathSchema.safeParse(imagePath);

  if (!parsed.success) {
    throw createError(
      "Invalid stored image path.",
      500
    );
  }

  const bucket = getStorage();

  try {
    const { data, error } = await bucket.remove([
      parsed.data,
    ]);

    if (error) throw error;

    z.array(
      z.object({
        name: z.string().min(1),
      })
    ).parse(data);
  } catch (cause) {
    throw createError(
      "The old image could not be deleted from storage.",
      503,
      cause
    );
  }
}