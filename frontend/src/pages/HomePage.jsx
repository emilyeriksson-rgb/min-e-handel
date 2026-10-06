import { useEffect, useState } from "react";
import { fetchProducts } from "../api/api.js";
import CourseCard from "../components/CourseCard.jsx";
import Loader from "../components/Loader.jsx";
import SearchInput from "../components/SearchInput.jsx";
import CourseFilters from "../components/CourseFilters.jsx";
import useCurrency from "../hooks/useCurrency.js";
import CategoryFilters from "../components/CategoryFilters.jsx";

function getFormat(product) {
  const format = String(
    product.learning_format ?? ""
  ).trim().toLowerCase();

  return format === "på plats" ? "onsite" : format;
}

function getPace(product) {
  return String(product.study_pace ?? "")
    .trim()
    .toLowerCase();
}

function getCategory(product) {
  return String(product.category ?? "").trim();
}

function matchesSearch(product, query) {
  return [
    product.category,
    product.title,
    product.short_description,
    product.description,
  ].some((text) =>
    String(text ?? "").toLowerCase().includes(query)
  );
}

function HomePage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [learningFormat, setLearningFormat] = useState("");
  const [studyPace, setStudyPace] = useState("");
  const { currency, rates } = useCurrency();
  const [priceRange, setPriceRange] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");

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

const query = searchText.trim().toLowerCase();

const rate = rates[currency];

const prices = products
  .map((product) => {
    const priceInSek =
      product.is_on_sale && product.sale_price != null
        ? product.sale_price
        : product.price;

    return Number(priceInSek) * rate;
  })
  .filter((price) => Number.isFinite(price) && price >= 0);

const hasPrices = prices.length > 0;

const lowestPrice = hasPrices
  ? Math.floor(Math.min(...prices))
  : 0;

const highestPrice = hasPrices
  ? Math.ceil(Math.max(...prices))
  : 0;

const currentRange =
  priceRange?.currency === currency
    ? priceRange
    : null;

const minPrice = currentRange?.min ?? lowestPrice;
const maxPrice = currentRange?.max ?? highestPrice;

function changeMinPrice(value) {
  setPriceRange({
    currency,
    min: Math.min(Number(value), maxPrice),
    max: maxPrice,
  });
}

function changeMaxPrice(value) {
  setPriceRange({
    currency,
    min: minPrice,
    max: Math.max(Number(value), minPrice),
  });
}

function matchesPrice(product) {
  const priceInSek =
    product.is_on_sale && product.sale_price != null
      ? product.sale_price
      : product.price;

  const convertedPrice = Number(priceInSek) * rate;

  return (
    Number.isFinite(convertedPrice) &&
    convertedPrice >= minPrice &&
    convertedPrice <= maxPrice
  );
}

const categories = [
  ...new Set(products.map(getCategory).filter(Boolean)),
].sort((a, b) => a.localeCompare(b, "sv"));

const filteredProducts = products.filter((product) =>
  matchesSearch(product, query) &&
  matchesPrice(product) &&
  (selectedCategory === "" ||
    getCategory(product) === selectedCategory) &&
  (learningFormat === "" ||
    getFormat(product) === learningFormat) &&
  (studyPace === "" ||
    getPace(product) === studyPace)
);

const formatCounts = {
  online: 0,
  onsite: 0,
  hybrid: 0,
};

const paceCounts = {
  "eget tempo": 0,
  heltid: 0,
  deltid: 0,
};

products.forEach((product) => {
  if (!matchesSearch(product, query)) return;
  if (!matchesPrice(product)) return;

  if (
  selectedCategory !== "" &&
  getCategory(product) !== selectedCategory
) {
  return;
}
 
const format = getFormat(product);
  const pace = getPace(product);

  // Räkna studieformer utifrån vald studietakt.
  if (
    (studyPace === "" || pace === studyPace) &&
    Object.hasOwn(formatCounts, format)
  ) {
    formatCounts[format] += 1;
  }

  // Räkna studietakter utifrån vald studieform.
  if (
    (learningFormat === "" || format === learningFormat) &&
    Object.hasOwn(paceCounts, pace)
  ) {
    paceCounts[pace] += 1;
  }
});

function resetFilters() {
  setSearchText("");
  setSelectedCategory("");
  setLearningFormat("");
  setStudyPace("");
  setPriceRange(null);
}

  return (
    <main className="site-main">
      <header className="site-homepage-header">

        <h1>Kurser</h1>
        <p>Utforska kurser online, i egen takt eller på plats.</p>
      </header>
      <SearchInput
        value={searchText}
        onChange={setSearchText}
      />

      <CategoryFilters
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <CourseFilters
        learningFormat={learningFormat}
        onLearningFormatChange={setLearningFormat}
        studyPace={studyPace}
        onStudyPaceChange={setStudyPace}
        formatCounts={formatCounts}
        paceCounts={paceCounts}
        currency={currency}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={changeMinPrice}
        onMaxPriceChange={changeMaxPrice}
        lowestPrice={lowestPrice}
        highestPrice={highestPrice}
        hasPrices={hasPrices}
      />

      <button type="button" onClick={resetFilters}>
        Rensa sökning och filter
      </button>

      {!isLoading && !error && (
        <p role="status">
          Visar {filteredProducts.length} av {products.length} kurser
        </p>
      )}

      <section className="course-grid">
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
          filteredProducts.map((product) => (
            <CourseCard
              key={product.id}
              product={product}
            />
          ))}

          {!isLoading &&
  !error &&
  products.length > 0 &&
  filteredProducts.length === 0 && (
    <p role="status">
  Inga kurser matchar din sökning och dina filter.
</p>
  )}
      </section>
    </main>
  );
}

export default HomePage;