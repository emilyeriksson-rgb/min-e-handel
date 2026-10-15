type FetchJsonOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export async function fetchJson(
  url: string,
  { headers = {}, timeoutMs = 5000 }: FetchJsonOptions = {},
): Promise<unknown> {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `API:t svarade med ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}