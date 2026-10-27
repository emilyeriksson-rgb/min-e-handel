import { useState } from "react";
import useCurrency from "../hooks/useCurrency.js";

function BookCard({ product }) {
  const { currency, rates } = useCurrency();
  const [failedImage, setFailedImage] = useState(null);

  const rate = rates[currency];

  const formattedPrice = rate === undefined
    ? "Valutakurs saknas"
    : (product.price * rate).toLocaleString("sv-SE", {
        style: "currency",
        currency,
      });

  const showImage =
    Boolean(product.image_url) &&
    failedImage !== product.image_url;

  return (
    <article className="course-card book-card">
      <div className="book-card__image">
        <span className="book-card__badge">
          Kurslitteratur
        </span>

        {showImage ? (
          <img
            className="book-card__cover"
            src={product.image_url}
            alt={`Produktbild för ${product.title}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailedImage(product.image_url)}
          />
        ) : (
          <span
            className="book-card__placeholder"
            aria-hidden="true"
          >
            📖
          </span>
        )}
      </div>

      <p className="category">{product.category}</p>
      <h2 className="title">{product.title}</h2>
      <strong>{formattedPrice}</strong>

      <p>
        {product.stock > 0 ? "Finns i lager" : "Slut i lager"}
      </p>

      <button
        type="button"
        className="book-card__buy"
        disabled
      >
        {product.stock > 0 ? "Köp" : "Slut i lager"}
      </button>
    </article>
  );
}

export default BookCard;