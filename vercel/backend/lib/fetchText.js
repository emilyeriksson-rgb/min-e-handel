                         
                                   
                     
                    
  

export async function fetchText(
  url        ,
  {
    headers = {},
    timeoutMs = 5000,
    encoding = "utf-8",
  }                   = {},
)                  {
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