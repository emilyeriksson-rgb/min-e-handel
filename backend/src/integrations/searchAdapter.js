import { algoliasearch } from "algoliasearch";
import { z } from "zod";

function getWriteClient() {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;

  if (!appId || !apiKey) {
    throw new Error("Algolias Application ID eller skrivnyckel saknas.");
  }

return algoliasearch(appId, apiKey, {
  timeouts: {
    connect: 2000,
    read: 5000,
    write: 5000,
  },
});}

export async function saveBooksToIndex(books) {
  const indexName = process.env.ALGOLIA_INDEX_NAME;

  if (!indexName) {
    throw new Error("Algolias indexnamn saknas.");
  }

  if (books.length === 0) {
    return;
  }

  const client = getWriteClient();

  const objects = books.map((book) => ({
    ...book,
    objectID: book.sku,
  }));

  await client.saveObjects({
    indexName,
    objects,
    waitForTasks: true,
  });
}

const SearchBook = z.object({
  sku: z.string().min(1),
  title: z.string().min(1),
  category: z.string(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  variants: z.array(z.string()),
  updatedAt: z.iso.datetime(),
});

const SearchResponse = z.object({
  hits: z.array(SearchBook),
  nbHits: z.number().int().nonnegative(),
  nbPages: z.number().int().nonnegative(),
});

export async function searchBooks({ query, page, pageSize }) {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const indexName = process.env.ALGOLIA_INDEX_NAME;

  if (!appId || !apiKey || !indexName) {
    throw new Error("Algolias sökinställningar saknas.");
  }

  const client = algoliasearch(appId, apiKey, {
    timeouts: {
      connect: 2000,
      read: 5000,
      write: 5000,
    },
  });

  const raw = await client.searchSingleIndex({
    indexName,
    searchParams: {
      query,
      page: page - 1,
      hitsPerPage: pageSize,
    },
  });

  const result = SearchResponse.safeParse(raw);

  if (!result.success) {
    throw new Error("Söktjänsten svarade med ett oväntat dataformat.");
  }

  return {
    books: result.data.hits,
    totalHits: result.data.nbHits,
    totalPages: result.data.nbPages,
    page,
    pageSize,
  };
}