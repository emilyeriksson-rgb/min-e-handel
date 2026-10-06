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