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