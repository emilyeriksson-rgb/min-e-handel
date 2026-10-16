import { fetchJson } from "../lib/fetchJson.js";
import { z } from "zod";

const FrankfurterRates = z.object({
  amount: z.number().positive(),
  base: z.string(),
  date: z.iso.date(),
  rates: z.record(z.string(), z.number().positive()),
});

type FrankfurterResponse = z.infer<typeof FrankfurterRates>;

type CurrencyRates = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

let cache: {
  value: CurrencyRates;
  expiresAt: number;
} | null = null;

export async function getRates(): Promise<CurrencyRates> {
  const baseUrl = process.env.CURRENCY_API_URL;
  const cacheMs =
  Number(process.env.CURRENCY_CACHE_SECONDS ?? 3600) * 1000;

if (cacheMs > 0 && cache && cache.expiresAt > Date.now()) {
  console.log("Valutacache: HIT");
  return cache.value;
}

console.log("Valutacache: MISS");

  if (!baseUrl) {
    throw new Error("CURRENCY_API_URL saknas i .env");
  }

  const url = new URL(`${baseUrl}/latest`);

  url.searchParams.set("base", "SEK");
  url.searchParams.set("symbols", "EUR,USD,DKK");

const raw = await fetchJson(url.toString());
const result = FrankfurterRates.safeParse(raw);

if (!result.success) {
  throw new Error(
    `Ogiltiga valutakurser: ${z.prettifyError(result.error)}`
  );
}

const data = result.data;

const value: CurrencyRates = {
  base: data.base,
  date: data.date,
  rates: {
    ...data.rates,
    SEK: 1,
  },
};

cache = {
  value,
  expiresAt: Date.now() + cacheMs,
};

return value;
}