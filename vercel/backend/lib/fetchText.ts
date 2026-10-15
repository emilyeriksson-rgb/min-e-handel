type FetchTextOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  encoding?: string;
};

export async function fetchText(
  url: string,
  {
    headers = {},
    timeoutMs = 5000,
    encoding = "utf-8",
  }: FetchTextOptions = {},
): Promise<string> {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `API:t svarade med ${response.status} ${response.statusText}`
    );
  }

  const bytes = await response.arrayBuffer();

  return new TextDecoder(encoding, { fatal: true }).decode(bytes);
}