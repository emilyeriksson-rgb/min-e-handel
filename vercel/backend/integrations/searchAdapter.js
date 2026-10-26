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
  price: Number(book.price),
  searchPrice: Number(book.price),
  updatedAt: book.updatedAt instanceof Date
    ? book.updatedAt.toISOString()
    : book.updatedAt,
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

export async function searchBooks({
  query,
  page,
  pageSize,
  type = "all",
  category = "",
  minPrice,
  maxPrice,
  learningFormat = "",
  studyPace = "",
  city = "",
  sort = "relevance",
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

const hasCourseFilters =
  learningFormat !== "" ||
  studyPace !== "" ||
  city !== "";

if (hasCourseFilters && type !== "course") {
  facetFilters.push("type:course");
}

if (learningFormat !== "") {
  facetFilters.push(`searchFormat:${learningFormat}`);
}

if (studyPace !== "") {
  facetFilters.push(`searchPace:${studyPace}`);
}

if (city !== "") {
  const escapedCity = city.startsWith("-")
    ? `\\${city}`
    : city;

  facetFilters.push(`cities:${escapedCity}`);
}

const numericFilters = [];

if (minPrice !== undefined) {
  numericFilters.push(`searchPrice >= ${minPrice}`);
}

if (maxPrice !== undefined) {
  numericFilters.push(`searchPrice <= ${maxPrice}`);
}

const searchIndices = {
  relevance: indexName,
  price_asc: `${indexName}_price_asc`,
  price_desc: `${indexName}_price_desc`,
};
if (!Object.hasOwn(searchIndices, sort)) {
  throw new Error("Ogiltig sortering.");
}

const raw = await client.searchSingleIndex({
  indexName: searchIndices[sort],
  searchParams: {
    query,
    page: page - 1,
    hitsPerPage: pageSize,
    facetFilters,
    numericFilters,
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

  searchPrice: Number(
    course.is_on_sale && course.sale_price != null
      ? course.sale_price
      : course.price
  ),

  sale_price: course.sale_price == null
    ? null
    : Number(course.sale_price),
  is_on_sale: course.is_on_sale,
  short_description: course.short_description ?? "",
  description: course.description ?? "",
  image_url: course.image_url ?? null,
  study_pace: course.study_pace ?? "",
  learning_format: course.learning_format,
  searchFormat: String(course.learning_format ?? "")
    .trim()
    .toLowerCase()
    .replace(/^på plats$/, "onsite"),

  searchPace: String(course.study_pace ?? "")
    .trim()
    .toLowerCase(),
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
  if (!indexName) throw new Error("Algolias indexnamn saknas.");

  const client = getWriteClient();
  const sharedSettings = {
    searchableAttributes: [
      "title", "sku", "category", "short_description", "description", "variants",
    ],
    attributesForFaceting: [
      "filterOnly(type)", "category", "filterOnly(searchFormat)",
      "filterOnly(searchPace)", "filterOnly(cities)",
    ],
    typoTolerance: true,
  };
  const replicas = [`${indexName}_price_asc`, `${indexName}_price_desc`];
  // Keep any existing replicas attached when adding our two price orders.
  let current = {};
  try {
    current = await client.getSettings({ indexName });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const { taskID } = await client.setSettings({
    indexName,
    indexSettings: {
      ...sharedSettings,
      replicas: [...new Set([...(current.replicas ?? []), ...replicas])],
    },
  });
  await client.waitForTask({ indexName, taskID });

  for (const [position, direction] of ["asc", "desc"].entries()) {
    const replicaName = replicas[position];
    const task = await client.setSettings({
      indexName: replicaName,
      indexSettings: {
        ...sharedSettings,
        ranking: [
          `${direction}(searchPrice)`, "typo", "geo", "words", "filters",
          "proximity", "attribute", "exact", "custom",
        ],
      },
    });
    await client.waitForTask({ indexName: replicaName, taskID: task.taskID });
  }
}

export async function removeBookFromIndex(sku) {
  const indexName = process.env.ALGOLIA_INDEX_NAME;

  if (!indexName) {
    throw new Error("Algolias indexnamn saknas.");
  }

  const client = getWriteClient();

  const { taskID } = await client.deleteObject({
    indexName,
    objectID: sku,
  });

  await client.waitForTask({
    indexName,
    taskID,
  });
}