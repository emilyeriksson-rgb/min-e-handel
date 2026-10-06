function CourseFilters({
  learningFormat,
  onLearningFormatChange,
  studyPace,
  onStudyPaceChange,
  formatCounts,
  paceCounts,
  currency,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  lowestPrice,
  highestPrice,
  hasPrices,
}) {
  const priceSpan = highestPrice - lowestPrice;

  const startPercent = priceSpan > 0
    ? ((minPrice - lowestPrice) / priceSpan) * 100
    : 0;

  const endPercent = priceSpan > 0
    ? ((maxPrice - lowestPrice) / priceSpan) * 100
    : 100;

  return (
    <fieldset className="course-filters">
      <legend>Filtrera kurser</legend>

      <label htmlFor="learning-format">Studieform</label>
      <select
        id="learning-format"
        value={learningFormat}
        onChange={(event) =>
          onLearningFormatChange(event.target.value)
        }
      >
        <option value="">Alla studieformer</option>
      <option value="online" disabled={formatCounts.online === 0}>
        Distans ({formatCounts.online})
        </option>

        <option value="onsite" disabled={formatCounts.onsite === 0}>
        På plats ({formatCounts.onsite})
        </option>

        <option value="hybrid" disabled={formatCounts.hybrid === 0}>
        Hybrid ({formatCounts.hybrid})
        </option>
      </select>

      <label htmlFor="study-pace">Studietakt</label>
      <select
        id="study-pace"
        value={studyPace}
        onChange={(event) =>
          onStudyPaceChange(event.target.value)
        }
      >
        <option value="">Alla studietakter</option>
        <option value="eget tempo" disabled={paceCounts["eget tempo"] === 0}>
          Eget tempo ({paceCounts["eget tempo"]})
        </option>
        <option value="heltid" disabled={paceCounts["heltid"] === 0}>
          Heltid ({paceCounts["heltid"]})
        </option>
        <option value="deltid" disabled={paceCounts["deltid"] === 0}>
          Deltid ({paceCounts["deltid"]})
        </option>
      </select>

       <div className="price-filter">
  <p id="price-range-label">
    Pris: {minPrice}–{maxPrice} {currency}
  </p>

  <div
    className="price-range"
    role="group"
    aria-labelledby="price-range-label"
  >
    <div className="price-range__track" aria-hidden="true" />
    <div
    className="price-range__selection"
    aria-hidden="true"
    style={{
        left: `${startPercent}%`,
        width: `${endPercent - startPercent}%`,
    }}
    />

    <input
      className="price-range__input"
      type="range"
      aria-label={`Minpris i ${currency}`}
      min={lowestPrice}
      max={highestPrice}
      step="1"
      value={minPrice}
      disabled={!hasPrices || lowestPrice === highestPrice}
      onChange={(event) =>
        onMinPriceChange(event.target.value)
      }
    />

    <input
      className="price-range__input"
      type="range"
      aria-label={`Maxpris i ${currency}`}
      min={lowestPrice}
      max={highestPrice}
      step="1"
      value={maxPrice}
      disabled={!hasPrices || lowestPrice === highestPrice}
      onChange={(event) =>
        onMaxPriceChange(event.target.value)
      }
    />

    
  </div>

</div>

    </fieldset>
  );
}

export default CourseFilters;