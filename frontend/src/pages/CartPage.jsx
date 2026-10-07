import { Link } from "react-router-dom";
import useCart from "../hooks/useCart.js";
import useCurrency from "../hooks/useCurrency.js";

function CartPage() {
  const {cartItems, removeFromCart, updateQuantity, cartTotal,} = useCart();
  const { currency, rates } = useCurrency();

const formatPrice = (priceInSek) => {
  const amount = Number(priceInSek);

  const sekPrice = amount.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
  });

  if (currency === "SEK" || rates[currency] === undefined) {
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
          key={item.courseSessionId}>
           
            <h2>{item.title}</h2>

            {item.session.is_self_paced ? (
              <p>Online i egen takt – starta när du vill</p>
            ) : (
              <p>
                {item.session.location_type === "online"
                  ? "Online"
                  : item.session.city || "På plats"}
                {": "}
                {new Date(
                  item.session.start_date
                ).toLocaleDateString("sv-SE")}
              </p>
            )}

            <p>Pris: {formatPrice(item.price)}</p>

            <label htmlFor={`quantity-${item.courseSessionId}`}>
              Antal
            </label>

            <input
              id={`quantity-${item.courseSessionId}`}
              type="number"
              min="1"
              value={item.quantity}
              onChange={(event) =>
                updateQuantity(
                  item.courseSessionId,
                  Number(event.target.value)
                )
              }
            />

          {/*   <p>
              Delsumma:{" "}
              {formatPrice(item.price * item.quantity)}
            </p> */}

            <button
              type="button"
              onClick={() =>
                removeFromCart(item.courseSessionId)
              }
            >
              Ta bort
            </button>

          </li>
        ))}
      </ul>

      <section>
        <h2>Sammanställning</h2>
        <p>
          Valutaomräknade priser är ungefärliga. Fakturering sker i SEK.
        </p>

        <p className="cart-total">
          Totalt: <strong>{formatPrice(cartTotal)}</strong>
        </p>
   

 <Link to="/checkout">
          Gå till kassan
        </Link>
        
          
      </section>
    </main>
  );
}

export default CartPage;