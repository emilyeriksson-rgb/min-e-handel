import { useState } from "react";
import useCurrency from "../hooks/useCurrency.js";
import useCart from "../hooks/useCart.js";

function BookCard({ product }) {
  const { currency, rates } = useCurrency();
  const { addToCart, cartItems } = useCart();

  const [failedImage, setFailedImage] = useState(null);

  const quantityInCart = cartItems.find(
    (item) =>
      item.type === "book" &&
      item.sku === product.sku
  )?.quantity ?? 0;

  const stock = Number(product.stock);

  const hasValidSku =
    typeof product.sku === "string" &&
    product.sku.trim().length > 0;

  const inStock =
    Number.isInteger(stock) &&
    stock > 0;

  const maxQuantity = inStock
    ? Math.min(stock, 99)
    : 0;

  const limitReached =
    inStock &&
    quantityInCart >= maxQuantity;

  const canAdd =
    hasValidSku &&
    inStock &&
    !limitReached;

  const rate = rates[currency];

  const formattedPrice = rate === undefined
    ? "Valutakurs saknas"
    : (Number(product.price) * rate).toLocaleString(
        "sv-SE",
        {
          style: "currency",
          currency,
        }
      );

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
            onError={() =>
              setFailedImage(product.image_url)
            }
          />
        ) : (
          <span
            className="book-card__placeholder"
            aria-hidden="true"
          >
            Bild saknas
          </span>
        )}
      </div>

      <p className="category">
        {product.category}
      </p>

      <h2 className="title">
        {product.title}
      </h2>

      <strong>{formattedPrice}</strong>

      <div className="book-card-foot">

      <p>
        {inStock ? "Finns i lager" : "Slut i lager"}
      </p>

      <button
        type="button"
        className="book-card__buy"
        disabled={!canAdd}
        onClick={() => addToCart(product)}
      >
        {!inStock
          ? "Slut i lager"
          : limitReached
            ? "Max antal i varukorgen"
            : "Köp"}
      </button>
      </div>
    </article>
  );
}

export default BookCard;