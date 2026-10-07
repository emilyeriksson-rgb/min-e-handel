import { Link, NavLink } from "react-router-dom";
import useCart from "../hooks/useCart.js";
import { FiShoppingCart } from "react-icons/fi";
import useCurrency from "../hooks/useCurrency.js";


function Header() {
    const { cartCount } = useCart();
    const { currency, setCurrency, loading, error, } = useCurrency();

  return (
    <header className="site-header">
      <div className="site-header-content">
        <div className="site-header-brand">
          <Link to="/"  aria-label="Onlinestudier startsida"><img src="/img/onlinestudier-logo-dark.webp" alt="Onlinestudier" className="site-header__logo" /></Link>
          <span className="site-header__partner">I sammarbete med<img src="/img/talivo-logo.webp" alt="talivo" className="site-talivo-logo" /></span>
        </div>

        <div className="currency-selector">
  <label htmlFor="currency">Valuta</label>

        <NavLink
          to="/cart"
          className="site-header__cart"
          aria-label={`Varukorg, ${cartCount} ${
            cartCount === 1 ? "produkt" : "produkter"
          }`}
        >
          <FiShoppingCart
            aria-hidden="true"
            focusable="false"
          />

          {cartCount > 0 && (
            <span aria-hidden="true">
              {cartCount}
            </span>
          )}
        </NavLink>
      </div>
          <div>


            <select
              disabled={loading || Boolean(error)}
              id="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="SEK">SEK</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="DKK">DKK</option>
            </select>

            {loading && (
              <span role="status">Hämtar valutakurser…</span>
            )}

            {error && (
              <span role="alert">
                {error} Priser visas i SEK.
              </span>
            )}
          </div>
      </div>
    </header>
  );
}

export default Header;