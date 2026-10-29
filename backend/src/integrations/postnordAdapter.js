import "dotenv/config";
import { z } from "zod";

function shippingError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const PostalCodeSchema = z.string()
  .trim()
  .regex(/^\d{3}\s?\d{2}$/)
  .transform((value) => value.replace(/\s/g, ""));

export function normalizePostalCode(value) {
  const result = PostalCodeSchema.safeParse(value);

  if (!result.success) {
    throw shippingError(
      "Ange ett svenskt postnummer med fem siffror.",
      400
    );
  }

  return result.data;
}

const ServicePointSchema = z.object({
  servicePointId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  visitingAddress: z.object({
    countryCode: z.literal("SE"),
    streetName: z.string().trim().min(1),
    streetNumber: z.string().nullish(),
    postalCode: z.string().trim().min(1),
    city: z.string().trim().min(1),
  }),
});

const ServicePointsResponseSchema = z.object({
  servicePointInformationResponse: z.object({
    compositeFault: z.null().optional(),
    servicePoints: z.array(ServicePointSchema),
  }),
});

export async function getNearestServicePoints(postalCode) {
  const normalizedPostalCode = normalizePostalCode(postalCode);
  const apiKey = process.env.POSTNORD_API_KEY?.trim();

  if (!apiKey) {
    throw shippingError(
      "Ombudssökningen är inte tillgänglig just nu.",
      503
    );
  }

  const url = new URL(
    "/rest/businesslocation/v5/servicepoints/nearest/byaddress",
    "https://atapi2.postnord.com"
  );

  url.search = new URLSearchParams({
    apikey: apiKey,
    returnType: "json",
    countryCode: "SE",
    agreementCountry: "SE",
    postalCode: normalizedPostalCode,
    numberOfServicePoints: "5",
    context: "optionalservicepoint",
    responseFilter: "public",
    typeId: "25",
  }).toString();

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error("PostNord request failed");
    }

    const parsed = ServicePointsResponseSchema.safeParse(
      await response.json()
    );

    if (!parsed.success) {
      throw new Error("Invalid PostNord response");
    }

    return parsed.data.servicePointInformationResponse
      .servicePoints.map((point) => ({
        id: point.servicePointId,
        countryCode: point.visitingAddress.countryCode,
        name: point.name,
        address: [
          point.visitingAddress.streetName,
          point.visitingAddress.streetNumber,
        ].filter(Boolean).join(" "),
        postalCode: point.visitingAddress.postalCode,
        city: point.visitingAddress.city,
      }));
  } catch {
    // Skicka aldrig vidare URL, nyckel eller PostNords råa fel.
    throw shippingError(
      "Kunde inte hämta ombud. Försök igen om en stund.",
      503
    );
  }
}

const ShippingMethodSchema = z.enum([
  "service_point",
  "home",
]);

const AdditionalServiceSchema = z.object({
  code: z.string().optional(),
  additionalServiceCode: z.string().optional(),
  name: z.string().optional(),
});

const DayRangeSchema = z.object({
  daysMinimum: z.number().int().nonnegative(),
  daysMaximum: z.number().int().nonnegative(),
}).refine(
  (range) => range.daysMinimum <= range.daysMaximum
);

const TransitTimeResponseSchema = z.array(
  z.object({
    service: z.object({
      basicServiceCode: z.string().min(1),

      // Schemat anger array, men ett dokumentationsexempel
      // visar ett objekt. Vi validerar båda uttryckligen.
      additionalServices: z.union([
        z.array(AdditionalServiceSchema),
        AdditionalServiceSchema,
      ]).nullish(),
    }),

    isSupported: z.boolean(),
    isBookable: z.boolean(),
    errorMessage: z.string().nullish(),

    estimatedTimeOfArrival: z.object({
      timeOfArrival: z.iso.datetime({
        local: true,
        offset: true,
      }).nullish(),

      dayRangeOfArrival: DayRangeSchema.nullish(),
    }).nullish(),
  })
);

function getPlannedHandoverTime() {
  // Shoppens antagande: överlämning nästa vardag kl. 09.
  // Svensk kalenderdag används även när servern kör i UTC.
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (type) =>
    parts.find((part) => part.type === type).value;

  const date = new Date(Date.UTC(
    Number(getPart("year")),
    Number(getPart("month")) - 1,
    Number(getPart("day"))
  ));

  do {
    date.setUTCDate(date.getUTCDate() + 1);
  } while (
    date.getUTCDay() === 0 ||
    date.getUTCDay() === 6
  );

  return `${date.toISOString().slice(0, 10)}T09:00:00`;
}

function getArrivalDate(value) {
  // PostNords exempel använder lokal tid utan tidszon.
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return value.slice(0, 10);
  }

  // Om svaret har en tidszon räknar vi fram svensk dag.
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const getPart = (type) =>
    parts.find((part) => part.type === type).value;

  return [
    getPart("year"),
    getPart("month"),
    getPart("day"),
  ].join("-");
}

export async function getEstimatedDelivery({
  postalCode,
  method,
}) {
  const destinationPostalCode =
    normalizePostalCode(postalCode);

  const methodResult = ShippingMethodSchema.safeParse(method);

  if (!methodResult.success) {
    throw shippingError(
      "Välj ombud eller hemleverans.",
      400
    );
  }

  const apiKey = process.env.POSTNORD_API_KEY?.trim();

  const originResult = PostalCodeSchema.safeParse(
    process.env.SHOP_POSTAL_CODE
  );

  if (!apiKey || !originResult.success) {
    throw shippingError(
      "Leveransberäkningen är inte tillgänglig just nu.",
      503
    );
  }

  const serviceCode =
    methodResult.data === "service_point" ? "19" : "17";

  const handoverTime = getPlannedHandoverTime();

  const url = new URL(
    "https://atapi2.postnord.com/rest/transport/v2/transittime/addresstoaddress"
  );

  url.search = new URLSearchParams({
    apikey: apiKey,
    startTime: handoverTime,
    serviceCodes: serviceCode,
    originPostalCode: originResult.data,
    originCountryCode: "SE",
    destinationPostalCode,
    destinationCountryCode: "SE",
  }).toString();

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error("PostNord request failed");
    }

    const entries = TransitTimeResponseSchema.parse(
      await response.json()
    );

    // Välj grundtjänsten, inte t.ex. en dyrare
    // tilläggstjänst med leverans före kl. 09.
    const matches = entries.filter((entry) => {
      const extras = entry.service.additionalServices;
      const hasExtras = Array.isArray(extras)
        ? extras.length > 0
        : extras != null;

      return (
        entry.service.basicServiceCode === serviceCode &&
        !hasExtras
      );
    });

    const entry = matches.length === 1 ? matches[0] : null;

    const unavailable = {
      available: false,
      method: methodResult.data,
      handoverTime,
      message: "Beräknad leveranstid saknas för detta fraktalternativ.",
    };

    if (
      !entry ||
      !entry.isSupported ||
      !entry.isBookable ||
      entry.errorMessage
    ) {
      return unavailable;
    }

    const eta = entry.estimatedTimeOfArrival;

    if (eta?.timeOfArrival) {
      return {
        available: true,
        method: methodResult.data,
        handoverTime,
        arrivalDate: getArrivalDate(eta.timeOfArrival),
        dayRange: null,
      };
    }

    if (eta?.dayRangeOfArrival) {
      return {
        available: true,
        method: methodResult.data,
        handoverTime,
        arrivalDate: null,
        dayRange: {
          min: eta.dayRangeOfArrival.daysMinimum,
          max: eta.dayRangeOfArrival.daysMaximum,
        },
      };
    }

    return unavailable;
  } catch {
    throw shippingError(
      "Kunde inte beräkna leveranstiden. Försök igen om en stund.",
      503
    );
  }
}