const API_URL = import.meta.env.VITE_API_URL;

export const fetchProducts = async () => {
  const response = await fetch(`${API_URL}/courses`);

if (!response.ok) {
    throw new Error('Kunde inte hämta produkter');
  }

  return response.json();
};