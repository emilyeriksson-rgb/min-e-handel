function SearchInput({ value, onChange }) {
  return (
    <div className="course-search">
      <label htmlFor="course-search">Sök utbildning</label>

      <input
        id="course-search"
        type="search"
        placeholder="Sök kategori, titel eller beskrivning"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export default SearchInput;