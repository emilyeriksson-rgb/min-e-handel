import { z } from "zod";
import {
  getNearestServicePoints,
  normalizePostalCode,
} from "../integrations/postnordAdapter.js";

const SHIPPING_PRICES = Object.freeze({
  service_point: 5900,
  home: 9900,
});

const FREE_SHIPPING_THRESHOLD = 50000;

export function calculateShippingPrice({
  method,
  bookSubtotalOre,
  hasBooks,
}) {
  if (
    typeof hasBooks !== "boolean" ||
    !Number.isSafeInteger(bookSubtotalOre) ||
    bookSubtotalOre < 0
  ) {
    throw new Error("Invalid server-side shipping calculation.");
  }

  if (!hasBooks) {
    if (bookSubtotalOre !== 0) {
      throw new Error("Book subtotal must be zero without books.");
    }

    return 0;
  }

  if (!Object.hasOwn(SHIPPING_PRICES, method)) {
    const error = new Error(
      "Välj ombud eller hemleverans."
    );
    error.status = 400;
    throw error;
  }

  if (bookSubtotalOre >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }

  return SHIPPING_PRICES[method];
}

const ServicePointSelectionSchema = z.object({
  servicePointId: z.string().trim().min(1).max(100),
  countryCode: z.literal("SE"),
});

export async function validateServicePoint({
  postalCode,
  servicePointId,
  countryCode,
}) {
  const normalizedPostalCode =
    normalizePostalCode(postalCode);

  const result = ServicePointSelectionSchema.safeParse({
    servicePointId,
    countryCode,
  });

  if (!result.success) {
    const error = new Error(
      "Välj ett giltigt ombud i Sverige."
    );
    error.status = 400;
    throw error;
  }

  const servicePoints = await getNearestServicePoints(
    normalizedPostalCode
  );

  const selected = servicePoints.find((point) =>
    point.id === result.data.servicePointId &&
    point.countryCode === result.data.countryCode
  );

  if (!selected) {
    const error = new Error(
      "Det valda ombudet finns inte bland ombuden för ditt postnummer. Sök och välj ombud igen."
    );
    error.status = 400;
    throw error;
  }

  // Namn och adress kommer från PostNord,
  // aldrig från kundens inskickade uppgifter.
  return selected;
}