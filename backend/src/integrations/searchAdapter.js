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
  type: "book",
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
  type: z.literal("book"),
  updatedAt: z.iso.datetime(),
});

const SearchCourse = z.object({
  type: z.literal("course"),
  id: z.number().int().positive(),
  title: z.string().min(1),
  category: z.string(),
  price: z.number().nonnegative(),
  sale_price: z.number().nonnegative().nullable(),
  is_on_sale: z.boolean(),
  short_description: z.string(),
  description: z.string(),
  image_url: z.string().nullable(),
  study_pace: z.string(),
  learning_format: z.string(),
  cities: z.array(z.string()),
});

const SearchProduct = z.discriminatedUnion("type", [
  SearchBook,
  SearchCourse,
]);

const SearchResponse = z.object({
  hits: z.array(SearchProduct),
  nbHits: z.number().int().nonnegative(),
  nbPages: z.number().int().nonnegative(),
});

export async function searchBooks({ query, page, pageSize, type = "all",   category = "",

 }) {
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

  const facetFilters = [];

if (type !== "all") {
  facetFilters.push(`type:${type}`);
}

if (category !== "") {
  const escapedCategory = category.startsWith("-")
    ? `\\${category}`
    : category;

  facetFilters.push(`category:${escapedCategory}`);
}

const raw = await client.searchSingleIndex({
  indexName,
  searchParams: {
    query,
    page: page - 1,
    hitsPerPage: pageSize,
    facetFilters,
  },
});

  const result = SearchResponse.safeParse(raw);

  if (!result.success) {
    throw new Error("Söktjänsten svarade med ett oväntat dataformat.");
  }

  return {
    products: result.data.hits,
    totalHits: result.data.nbHits,
    totalPages: result.data.nbPages,
    page,
    pageSize,
  };
}

export async function saveCoursesToIndex(courses) {
  const indexName = process.env.ALGOLIA_INDEX_NAME;

  if (!indexName) {
    throw new Error("Algolias indexnamn saknas.");
  }

  const publishedCourses = courses.filter(
    (course) => course.is_published
  );

  if (publishedCourses.length === 0) {
    return;
  }

  const client = getWriteClient();

  const objects = publishedCourses.map((course) => ({
    objectID: `course-${course.id}`,
    type: "course",
    id: course.id,
    title: course.title,
    category: course.category ?? "",
    price: Number(course.price),
    sale_price: course.sale_price == null
      ? null
      : Number(course.sale_price),
    is_on_sale: course.is_on_sale,
    short_description: course.short_description ?? "",
    description: course.description ?? "",
    image_url: course.image_url ?? null,
    study_pace: course.study_pace ?? "",
    learning_format: course.learning_format,
    cities: course.cities ?? [],
  }));

  await client.saveObjects({
    indexName,
    objects,
    waitForTasks: true,
  });
}

export async function removeCourseFromIndex(courseId) {
  const indexName = process.env.ALGOLIA_INDEX_NAME;

  if (!indexName) {
    throw new Error("Algolias indexnamn saknas.");
  }

  const client = getWriteClient();

  const { taskID } = await client.deleteObject({
    indexName,
    objectID: `course-${courseId}`,
  });

  await client.waitForTask({
    indexName,
    taskID,
  });
}

export async function configureSearchIndex() {
  const indexName = process.env.ALGOLIA_INDEX_NAME;

  if (!indexName) {
    throw new Error("Algolias indexnamn saknas.");
  }

  const client = getWriteClient();

  const { taskID } = await client.setSettings({
    indexName,
    indexSettings: {
      attributesForFaceting: ["filterOnly(type)", "category"],
    },
  });

  await client.waitForTask({
    indexName,
    taskID,
  });
}