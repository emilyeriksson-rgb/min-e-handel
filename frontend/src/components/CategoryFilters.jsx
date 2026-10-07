function CategoryFilters({
  categories,
  selectedCategory,
  onCategoryChange,
}) {
  return (
    <fieldset className="category-filters">
      <legend>Kategori</legend>

      <button
        type="button"
        aria-pressed={selectedCategory === ""}
        onClick={() => onCategoryChange("")}
      >
        Alla kategorier
      </button>

      {categories.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={selectedCategory === category}
          onClick={() => onCategoryChange(category)}
        >
          {category}
        </button>
      ))}
    </fieldset>
  );
}

export default CategoryFilters;