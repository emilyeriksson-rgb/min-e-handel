export async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(
      `API:t svarade med ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}