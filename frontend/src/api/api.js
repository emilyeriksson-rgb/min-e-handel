const API_URL = import.meta.env.VITE_API_URL;



export const fetchProducts = async () => {
  const response = await fetch(`${API_URL}/courses`);

if (!response.ok) {
    throw new Error('Kunde inte hämta produkter');
  }

  return response.json();
};


export const fetchProductById = async (id) => {
  const response = await fetch(`${API_URL}/courses/${id}`);

  if (response.status === 404) {
    throw new Error("Kursen hittades inte");
  }

  if (!response.ok) {
    throw new Error("Kunde inte hämta kursen");
  }

  return response.json();
};



export const fetchCourseSessions = async (courseId) => {
  const response = await fetch(
    `${API_URL}/courses/${courseId}/sessions`
  );

  if (!response.ok) {
    throw new Error("Kunde inte hämta kurstillfällen");
  }

  return response.json();
};

export const createOrder = async (orderData) => {
  const response = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Kunde inte skapa ordern."
    );
  }

  return data;
};

export const createCourse = async (courseData) => {
  const response = await fetch(`${API_URL}/courses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(courseData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Kunde inte skapa utbildningen."
    );
  }

  return data;
};

export const updateCourse = async (
  courseId,
  courseData
) => {
  const response = await fetch(
    `${API_URL}/courses/${courseId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(courseData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Kunde inte uppdatera utbildningen."
    );
  }

  return data;
};


export const fetchLocations = async () => {
  const response = await fetch(`${API_URL}/locations`);

  if (!response.ok) {
    throw new Error("Kunde inte hämta platser.");
  }

  return response.json();
};

export const createLocation = async (location) => {
  const response = await fetch(`${API_URL}/locations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(location),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.message || "Kunde inte skapa plats."
    );
  }

  return response.json();
};

export const createCourseSession = async (
  courseId,
  sessionData
) => {
  const response = await fetch(
    `${API_URL}/courses/${courseId}/sessions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Kunde inte skapa kurstillfället."
    );
  }

  return data;
};

export const fetchOrders = async () => {
  const response = await fetch(`${API_URL}/orders`);

  if (!response.ok) {
    throw new Error("Kunde inte hämta ordrar.");
  }

  return response.json();
};

export const fetchOrderById = async (orderId) => {
  const response = await fetch(
    `${API_URL}/orders/${orderId}`
  );

  if (!response.ok) {
    throw new Error("Kunde inte hämta ordern.");
  }

  return response.json();
};

export const updateOrderStatus = async (
  orderId,
  orderStatus
) => {
  const response = await fetch(
    `${API_URL}/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_status: orderStatus,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Kunde inte uppdatera orderstatus."
    );
  }

  return data;
};

export const updateInvoiceStatus = async (
  orderId,
  invoiceStatus
) => {
  const response = await fetch(
    `${API_URL}/orders/${orderId}/invoice-status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invoice_status: invoiceStatus,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Kunde inte uppdatera fakturastatus."
    );
  }

  return data;
};

export const fetchCurrencyRates = async () => {
  const response = await fetch(`${API_URL}/currency`);

  if (!response.ok) {
    throw new Error("Kunde inte hämta valutakurser.");
  }

  return response.json();
};

export const importBooks = async (format) => {
  const response = await fetch(
    `${API_URL}/books/import/${format}`,
    {
      method: "POST",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Kunde inte importera kurslitteraturen."
    );
  }

  return data;
};

export async function searchBooks(query, page = 1) {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: "10",
  });

  const response = await fetch(`${API_URL}/search?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Kunde inte söka kurslitteratur.");
  }

  return data;
}

export async function searchProducts({
  query = "",
  type = "all",
  category = "",
  learningFormat = "",
  studyPace = "",
  city = "",
  sort = "relevance",
  minPrice,
  maxPrice,
  page = 1,
  pageSize = 12,
  signal,
} = {}) {
  const params = new URLSearchParams({
    q: query,
    type,
    category,
    learningFormat,
    studyPace,
    city,
    sort,
    page: String(page),
    pageSize: String(pageSize),
  });

  if (minPrice !== undefined) {
    params.set("minPrice", String(minPrice));
  }

  if (maxPrice !== undefined) {
    params.set("maxPrice", String(maxPrice));
  }

  const response = await fetch(`${API_URL}/search?${params}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(
      "Kunde inte hämta sökresultatet. Försök igen senare."
    );
  }

  return response.json();
}

export async function fetchCatalog() {
  const response = await fetch(`${API_URL}/catalog`);

  if (!response.ok) {
    throw new Error("Kunde inte hämta kurser och kurslitteratur.");
  }

  return response.json();
}

export async function fetchBooks() {
  const response = await fetch(`${API_URL}/books`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Kunde inte hämta böckerna.");
  }

  return data.books;
}

export async function updateBook(sku, book) {
  const response = await fetch(
    `${API_URL}/books/${encodeURIComponent(sku)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(book),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Kunde inte spara boken.");
  }

  return data;
}

export async function deleteBook(sku) {
  const response = await fetch(
    `${API_URL}/books/${encodeURIComponent(sku)}`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Kunde inte ta bort boken.");
  }

  return data;
}

export async function uploadProductImage({
  productType,
  productId,
  file,
}) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(
    `${API_URL}/product-images/${productType}/${encodeURIComponent(productId)}`,
    {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(45_000),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        "The image could not be uploaded. Please try again."
    );
  }

  if (
    typeof data.image_url !== "string" ||
    typeof data.image_path !== "string"
  ) {
    throw new Error(
      "The upload response was incomplete. Refresh the product before retrying."
    );
  }

  return data;
}

async function shippingRequest(
  path,
  { method = "GET", body, signal } = {}
) {
  const timeoutSignal = AbortSignal.timeout(20000);

  const response = await fetch(`${API_URL}/shipping${path}`, {
    method,
    headers: body
      ? { "Content-Type": "application/json" }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Kunde inte hämta leveransuppgifterna."
    );
  }

  return data;
}

export function fetchShippingQuote(body, signal) {
  return shippingRequest("/quote", {
    method: "POST",
    body,
    signal,
  });
}

export function fetchServicePoints(postalCode, signal) {
  const query = new URLSearchParams({ postalCode });

  return shippingRequest(`/service-points?${query}`, {
    signal,
  });
}

export function fetchDeliveryEstimate(
  postalCode,
  method,
  signal
) {
  const query = new URLSearchParams({
    postalCode,
    method,
  });

  return shippingRequest(`/delivery-estimate?${query}`, {
    signal,
  });
}