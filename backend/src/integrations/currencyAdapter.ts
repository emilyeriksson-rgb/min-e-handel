type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

type CurrencyRates = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

export async function getRates(): Promise<CurrencyRates> {
  const baseUrl = process.env.CURRENCY_API_URL;

  if (!baseUrl) {
    throw new Error("CURRENCY_API_URL saknas i .env");
  }

  const url = new URL(`${baseUrl}/latest`);

  url.searchParams.set("base", "SEK");
  url.searchParams.set("symbols", "EUR,USD,DKK");

    const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(
      `Valutatjänsten svarade med HTTP ${response.status}`
    );
  }

const data = await response.json() as FrankfurterResponse;

return {
  base: data.base,
  date: data.date,
  rates: {
    ...data.rates,
    SEK: 1,
  },
};
}