const options = [
  { value: "all", label: "Alla" },
  { value: "course", label: "Kurser" },
  { value: "book", label: "Kurslitteratur" },
];

function ProductTypeFilters({ value, onChange }) {
  return (
    <div
      className="product-type-filters"
      role="group"
      aria-label="Visa produkttyp"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ProductTypeFilters;