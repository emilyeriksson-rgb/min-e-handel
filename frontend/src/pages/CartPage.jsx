import { Link } from "react-router-dom";
import useCart from "../hooks/useCart.js";
import useCurrency from "../hooks/useCurrency.js";

function CartPage() {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    cartTotal,
  } = useCart();

  const { currency, rates } = useCurrency();

  const formatPrice = (priceInSek) => {
    const amount = Number(priceInSek);

    const sekPrice = amount.toLocaleString("sv-SE", {
      style: "currency",
      currency: "SEK",
    });

    if (
      currency === "SEK" ||
      rates[currency] === undefined
    ) {
      return sekPrice;
    }

    const convertedPrice = (
      amount * rates[currency]
    ).toLocaleString("sv-SE", {
      style: "currency",
      currency,
    });

    return `${sekPrice} ≈ ${convertedPrice}`;
  };

  if (cartItems.length === 0) {
    return (
      <main className="site-main cart-page cart-page-empty bokad">
        <h1>Varukorg</h1>
        <p>Din varukorg är tom.</p>

        <Link to="/courses">
          Tillbaka till kurserna
        </Link>
      </main>
    );
  }

  return (
    <main className="site-main cart-page">
      <h1>Varukorg</h1>

      <ul>
        {cartItems.map((item) => (
          <li
            className="cart-item"
            key={item.id}
          >
            <h2>{item.title}</h2>

            {item.type === "book" ? (
              <p>Kurslitteratur</p>
            ) : item.session?.is_self_paced ? (
              <p>
                Online i egen takt – starta när du vill
              </p>
            ) : (
              <p>
                {item.session?.location_type === "online"
                  ? "Online"
                  : item.session?.city || "På plats"}

                {item.session?.start_date && (
                  <>
                    {": "}
                    {new Date(
                      item.session.start_date
                    ).toLocaleDateString("sv-SE")}
                  </>
                )}
              </p>
            )}

            <p>Pris: {formatPrice(item.price)}</p>

            <label htmlFor={`quantity-${item.id}`}>
              Antal
            </label>

            <input
              id={`quantity-${item.id}`}
              type="number"
              min="1"
              max={item.maxQuantity}
              step="1"
              value={item.quantity}
              onChange={(event) =>
                updateQuantity(
                  item.id,
                  Number(event.target.value)
                )
              }
            />

            <button
              type="button"
              onClick={() => removeFromCart(item.id)}
            >
              Ta bort
            </button>
          </li>
        ))}
      </ul>

      <section>
        <h2>Sammanställning</h2>

        <p>
          Valutaomräknade priser är ungefärliga.
          Betalning sker i SEK.
          Frakt för böcker beräknas i kassan.
        </p>

        <p className="cart-total">
          Totalt:{" "}
          <strong>{formatPrice(cartTotal)}</strong>
        </p>

        <Link to="/checkout">
          Gå till kassan
        </Link>
      </section>
    </main>
  );
}

export default CartPage;