import { useEffect, useState } from "react";
import { fetchProducts } from "../api/api.js";
import CourseCard from "../components/CourseCard.jsx";
import Loader from "../components/Loader.jsx";

function HomePage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();

        const publishedProducts = data.filter(
          (product) => product.is_published
        );

        setProducts(publishedProducts);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <main>
      <header>
        <h1>Kurser</h1>
        <p>Utforska kurser online, i egen takt eller på plats.</p>
      </header>

      <section>
        {isLoading && (
          <Loader message="Laddar kurser..." />
        )}

        {!isLoading && error && (
          <p role="alert">{error}</p>
        )}

        {!isLoading && !error && products.length === 0 && (
          <p>Det finns inga publicerade kurser just nu.</p>
        )}

        {!isLoading &&
          !error &&
          products.map((product) => (
            <CourseCard
              key={product.id}
              product={product}
            />
          ))}
      </section>
    </main>
  );
}

export default HomePage;