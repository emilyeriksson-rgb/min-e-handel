                         
                                   
                     
  

export async function fetchJson(
  url        ,
  { headers = {}, timeoutMs = 5000 }                   = {},
)                   {
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