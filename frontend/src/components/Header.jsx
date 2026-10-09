import { Link, NavLink, useLocation } from "react-router-dom";
import { FiShoppingCart } from "react-icons/fi";
import useCart from "../hooks/useCart.js";
import useCurrency from "../hooks/useCurrency.js";

function Header() {
  const { pathname } = useLocation();
const isHomePage =
  pathname === "/" ||
  pathname === "/courses" ||
  pathname === "/courses/";
  const { cartCount } = useCart();
  const { currency, setCurrency, loading, error } = useCurrency();

  return (
    <header
      className={`site-header${isHomePage ? " site-header--home" : ""}`}
    >
      <div className="site-header-content">
        {!isHomePage && (
          <div className="site-header-brand">
            <Link to="/" aria-label="Kursrum startsida">
              <img
                src="/img/SVG/loga.svg"
                alt="Kursrum"
                className="site-header__logo"
              />
            </Link>
          </div>
        )}

        <div className="header-actions">
          <div className="header-currency">
            <label className="visually-hidden" htmlFor="currency">
              Valuta
            </label>

            <select
              id="currency"
              disabled={loading || Boolean(error)}
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
              <span role="alert">{error} Priser visas i SEK.</span>
            )}
          </div>

          <NavLink
            to="/cart"
            className="site-header__cart"
            aria-label={`Varukorg, ${cartCount} ${
              cartCount === 1 ? "produkt" : "produkter"
            }`}
          >
            <FiShoppingCart aria-hidden="true" focusable="false" />

            {cartCount > 0 && (
              <span aria-hidden="true">{cartCount}</span>
            )}
          </NavLink>
        </div>
      </div>
    </header>
  );
}

export default Header;