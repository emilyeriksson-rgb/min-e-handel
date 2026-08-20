import { Link } from "react-router-dom";
import useCart from "../hooks/useCart.js";

function CartPage() {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    cartTotal,
  } = useCart();

  const formatPrice = (price) =>
    Number(price).toLocaleString("sv-SE", {
      style: "currency",
      currency: "SEK",
    });

  if (cartItems.length === 0) {
    return (
      <main>
        <h1>Varukorg</h1>
        <p>Din varukorg är tom.</p>

        <Link to="/courses">
          Tillbaka till kurserna
        </Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Varukorg</h1>

      <ul>
        {cartItems.map((item) => (
          <li key={item.courseSessionId}>
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
              />
            )}

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

            <p>
              Delsumma:{" "}
              {formatPrice(item.price * item.quantity)}
            </p>

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