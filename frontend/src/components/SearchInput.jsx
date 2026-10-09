function SearchInput({ value, onChange }) {
  return (
    <div className="course-search">
      <label className="visually-hidden" htmlFor="course-search">
        Sök utbildning
      </label>
      <div className="course-search__field">
        <svg className="course-search__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          id="course-search"
          type="search"
          placeholder="Vilken utbildning letar du efter?"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export default SearchInput;
