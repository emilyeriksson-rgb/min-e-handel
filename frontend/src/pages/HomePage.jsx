import { useEffect, useState } from "react";
import { fetchCatalog, searchProducts } from "../api/api.js";
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

function HomePage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState("relevance");
  const [learningFormat, setLearningFormat] = useState("");
  const [studyPace, setStudyPace] = useState("");
  const { currency, rates } = useCurrency();
  const [priceRange, setPriceRange] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [productType, setProductType] = useState("all");
  const [searchResult, setSearchResult] = useState({
    key: "",
    products: [],
    totalHits: 0,
    totalPages: 0,
    error: "",
  });

  const [pagination, setPagination] = useState({
    filterKey: "",
    page: 1,
  });

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
        (
          getFormat(product) === "onsite" ||
          getFormat(product) === "hybrid"
        ) &&
        (
          learningFormat === "" ||
          getFormat(product) === learningFormat
        ) &&        matchesPrice(product) &&
        (selectedCategory === "" ||
          getCategory(product) === selectedCategory) &&
        (studyPace === "" ||
          getPace(product) === studyPace)
      )
      .flatMap((product) => product.cities ?? [])
      .filter(Boolean)
  ),
].sort((a, b) => a.localeCompare(b, "sv"));

const hasRate = Number.isFinite(rate) && rate > 0;

const filters = {
  query: searchText.trim(),
  sort,
  type: productType,
  category: selectedCategory,
  learningFormat,
  studyPace,
  city: selectedCity,
  pageSize: 12,
};

// Prisreglaget visar vald valuta.
// Backend tar emot prisgränser i SEK.
if (currentRange && hasRate) {
  filters.minPrice =
    Math.ceil((minPrice / rate) * 100 - 0.000001) / 100;

  filters.maxPrice =
    Math.floor((maxPrice / rate) * 100 + 0.000001) / 100;
}

const filterKey = JSON.stringify(filters);

// Varje ändring av söktext eller filter börjar på sida 1.
const page = pagination.filterKey === filterKey
  ? pagination.page
  : 1;

const requestKey = JSON.stringify({
  ...filters,
  page,
});

const isSearching = searchResult.key !== requestKey;
const isBusy = isLoading || isSearching;

const filteredProducts = isSearching
  ? []
  : searchResult.products;

const totalHits = isSearching ? 0 : searchResult.totalHits;
const totalPages = isSearching ? 0 : searchResult.totalPages;

const displayedError =
  error || (isSearching ? "" : searchResult.error);

useEffect(() => {
  const controller = new AbortController();
  const request = JSON.parse(requestKey);

  const timer = setTimeout(async () => {
    try {
      // Ett mycket smalt intervall i en annan valuta kan
      // sakna priser med hela ören i SEK.
      const emptyPriceRange =
        request.minPrice !== undefined &&
        request.maxPrice !== undefined &&
        request.minPrice > request.maxPrice;

      const data = emptyPriceRange
        ? { products: [], totalHits: 0, totalPages: 0 }
        : await searchProducts({
            ...request,
            signal: controller.signal,
          });

      if (!controller.signal.aborted) {
        setSearchResult({
          key: requestKey,
          products: data.products,
          totalHits: data.totalHits,
          totalPages: data.totalPages,
          error: "",
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setSearchResult({
          key: requestKey,
          products: [],
          totalHits: 0,
          totalPages: 0,
          error: error.message || "Sökningen misslyckades.",
        });
      }
    }
  }, 250);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
}, [requestKey]);

function changePage(nextPage) {
  setPagination({
    filterKey,
    page: nextPage,
  });
}

  const formatCounts = { online: 0, onsite: 0, hybrid: 0 };
  const paceCounts = { "eget tempo": 0, heltid: 0, deltid: 0 };
  typeProducts.forEach((product) => {
    if (product.type !== "course") return;
    if (!matchesPrice(product)) return;
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
    setSort("relevance");
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
          <div className="catalog-sort">
            <label htmlFor="catalog-sort">Sortera</label>
            <select id="catalog-sort" value={sort}
              onChange={(event) => setSort(event.target.value)}>
              <option value="relevance">Relevans</option>
              <option value="price_asc">Pris: lägst först</option>
              <option value="price_desc">Pris: högst först</option>
            </select>
          </div>
          {!isBusy && !displayedError && (
            <p className="catalog-count" role="status">
              {totalHits} träffar
              {totalPages > 0 && ` · Sida ${page} av ${totalPages}`}
            </p>
          )}

          <section
            className="course-grid"
            aria-label="Kurser och kurslitteratur"
            aria-busy={isBusy}
          >
            {displayedError && (
              <p className="catalog-message" role="alert">
                {displayedError}
              </p>
            )}

            {isBusy && !displayedError && (
              <div className="catalog-message">
                <Loader message="Söker produkter..." />
              </div>
            )}

            {!isBusy && !displayedError && filteredProducts.map((product) =>
              product.type === "book" ? (
                <BookCard
                  key={`book-${product.sku}`}
                  product={product}
                />
              ) : (
                <CourseCard
                  key={`course-${product.id}`}
                  product={product}
                />
              )
            )}

            {!isBusy && !displayedError && totalHits === 0 && (
              <p className="catalog-message" role="status">
                Inga produkter matchar din sökning och dina filter.
              </p>
            )}
          </section>

          {!isBusy && !displayedError && totalPages > 1 && (
            <nav
              className="catalog-pagination"
              aria-label="Sökresultatets sidor"
            >
              <button
                type="button"
                className="btn-style"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
              >
                Föregående
              </button>

              <span>Sida {page} av {totalPages}</span>

              <button
                type="button"
                className="btn-style"
                disabled={page >= totalPages}
                onClick={() => changePage(page + 1)}
              >
                Nästa
              </button>
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}

export default HomePage;
