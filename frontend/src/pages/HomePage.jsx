import { useEffect, useState } from "react";
import { fetchCatalog } from "../api/api.js";
import BookCard from "../components/BookCard.jsx";
import CourseCard from "../components/CourseCard.jsx";
import Loader from "../components/Loader.jsx";
import SearchInput from "../components/SearchInput.jsx";
import CourseFilters from "../components/CourseFilters.jsx";
import useCurrency from "../hooks/useCurrency.js";
import CategoryFilters from "../components/CategoryFilters.jsx";
import OwlContact from "../components/OwlContact.jsx";
import ProductTypeFilters from "../components/ProductTypeFilters.jsx";

function getFormat(product) {
  const format = String(product.learning_format ?? "").trim().toLowerCase();
  return format === "på plats" ? "onsite" : format;
}
function getPace(product) {
  return String(product.study_pace ?? "").trim().toLowerCase();
}
function getCategory(product) {
  return String(product.category ?? "").trim();
}
function matchesSearch(product, query) {
  return [product.category, product.title, product.short_description, product.description]
    .some((text) => String(text ?? "").toLowerCase().includes(query));
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
  const [selectedCity, setSelectedCity] = useState("");
  const [productType, setProductType] = useState("all");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchCatalog();
      setProducts(data);
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
  const typeProducts = products.filter(
  (product) => productType === "all" || product.type === productType
);
  const prices = typeProducts.map((product) => {
    const priceInSek = product.is_on_sale && product.sale_price != null
      ? product.sale_price : product.price;
    return Number(priceInSek) * rate;
  }).filter((price) => Number.isFinite(price) && price >= 0);
  const hasPrices = prices.length > 0;
  const lowestPrice = hasPrices ? Math.floor(Math.min(...prices)) : 0;
  const highestPrice = hasPrices ? Math.ceil(Math.max(...prices)) : 0;
  const currentRange = priceRange?.currency === currency ? priceRange : null;
  const minPrice = currentRange?.min ?? lowestPrice;
  const maxPrice = currentRange?.max ?? highestPrice;

  function changeMinPrice(value) {
    setPriceRange({ currency, min: Math.min(Number(value), maxPrice), max: maxPrice });
  }
  function changeMaxPrice(value) {
    setPriceRange({ currency, min: minPrice, max: Math.max(Number(value), minPrice) });
  }
  function matchesPrice(product) {
    const priceInSek = product.is_on_sale && product.sale_price != null
      ? product.sale_price : product.price;
    const convertedPrice = Number(priceInSek) * rate;
    return Number.isFinite(convertedPrice) && convertedPrice >= minPrice && convertedPrice <= maxPrice;
  }

  const categories = [...new Set(typeProducts.map(getCategory).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "sv"));

  const cities = [
  ...new Set(
    typeProducts
      .filter((product) =>
        getFormat(product) === "onsite" &&
        matchesSearch(product, query) &&
        matchesPrice(product) &&
        (selectedCategory === "" ||
          getCategory(product) === selectedCategory) &&
        (studyPace === "" ||
          getPace(product) === studyPace)
      )
      .flatMap((product) => product.cities ?? [])
      .filter(Boolean)
  ),
].sort((a, b) => a.localeCompare(b, "sv"));

const filteredProducts = typeProducts.filter((product) =>
  matchesSearch(product, query) &&
  matchesPrice(product) &&
  (selectedCategory === "" ||
    getCategory(product) === selectedCategory) &&
  (learningFormat === "" ||
    getFormat(product) === learningFormat) &&
  (studyPace === "" ||
    getPace(product) === studyPace) &&
  (learningFormat !== "onsite" ||
    selectedCity === "" ||
    (product.cities ?? []).includes(selectedCity))
);
  const formatCounts = { online: 0, onsite: 0, hybrid: 0 };
  const paceCounts = { "eget tempo": 0, heltid: 0, deltid: 0 };
  typeProducts.forEach((product) => {
    if (!matchesSearch(product, query) || !matchesPrice(product)) return;
    if (selectedCategory !== "" && getCategory(product) !== selectedCategory) return;
    const format = getFormat(product);
    const pace = getPace(product);
    if ((studyPace === "" || pace === studyPace) && Object.hasOwn(formatCounts, format)) {
      formatCounts[format] += 1;
    }
    if ((learningFormat === "" || format === learningFormat) && Object.hasOwn(paceCounts, pace)) {
      paceCounts[pace] += 1;
    }
  });
  function resetFilters() {
    setSearchText("");
    setSelectedCategory("");
    setLearningFormat("");
    setStudyPace("");
    setPriceRange(null);
    setSelectedCity("");
    setProductType("all");
  }

  function changeLearningFormat(value) {
    setLearningFormat(value);
    setSelectedCity("");
  }

function changeProductType(value) {
  const nextProducts = products.filter(
    (product) => value === "all" || product.type === value
  );

  const categoryExists = nextProducts.some(
    (product) => getCategory(product) === selectedCategory
  );

  setProductType(value);

  if (!categoryExists) {
    setSelectedCategory("");
  }

  setLearningFormat("");
  setStudyPace("");
  setSelectedCity("");
  setPriceRange(null);
}

  return (
    <main className="site-main site-homepage">
      <header className="site-homepage-header homepage-hero">
        <div className="homepage-hero__text">
          <img
          src="/img/SVG/loga.svg"
          alt="Kursrum"
          className="homepage-hero__logo"
        />

        <h1>Kunskap för arbetslivet</h1>
        <p>
          Utveckla din kompetens med utbildningar för arbetslivet.
          Här hittar du kurser inom säkerhet, arbetsmiljö, praktiska
          yrkeskunskaper och AI på arbetsplatsen — online i din egen
          takt eller på plats med handledare.
        </p>
      </div>
        <OwlContact email="emily.eriksson@gmail.com" />
      
      </header>

      <div className="catalog-layout">
    <div className="catalog-toolbar">
  <h2 className="catalog-heading">
    Kurser och kurslitteratur
  </h2>

  <SearchInput
    value={searchText}
    onChange={setSearchText}
  />

  <div className="catalog-type-row">
    <ProductTypeFilters
      value={productType}
      onChange={changeProductType}
    />
  </div>

  <div className="catalog-category-row">
    <CategoryFilters
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
    />
  </div>
</div>
        <aside className="catalog-sidebar" aria-labelledby="catalog-filter-heading">
          <h2 id="catalog-filter-heading">Filtrera</h2>
          <CourseFilters
            learningFormat={learningFormat}
            onLearningFormatChange={changeLearningFormat}
            cities={cities}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
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
          <button className="filter-reset" type="button" onClick={resetFilters}>
            Rensa
          </button>
        </aside>

        <div className="catalog-results">
          {!isLoading && !error && (
            <p className="catalog-count" role="status">
              Visar {filteredProducts.length} av {typeProducts.length} produkter</p>
          )}
          <section className="course-grid" aria-label="Utbildningar" aria-busy={isLoading}>
            {isLoading && <div className="catalog-message"><Loader message="Laddar produkter..." /></div>}
            {!isLoading && error && <p className="catalog-message" role="alert">{error}</p>}
            {!isLoading && !error && products.length === 0 && (
              <p className="catalog-message">Det finns inga publicerade produkter just nu.</p>
            )}
          {!isLoading && !error && filteredProducts.map((product) =>
            product.type === "book" ? (
              <BookCard key={`book-${product.sku}`} product={product} />
            ) : (
              <CourseCard key={`course-${product.id}`} product={product} />
            )
          )}
            {!isLoading && !error && products.length > 0 && filteredProducts.length === 0 && (
              <p className="catalog-message" role="status">Inga produkter matchar din sökning och dina filter.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default HomePage;
