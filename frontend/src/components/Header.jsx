import { Link, NavLink } from "react-router-dom";
import useCart from "../hooks/useCart.js";
import { FiShoppingCart } from "react-icons/fi";


function Header() {
    const { cartCount } = useCart();

  return (
    <header className="site-header">
      <div className="site-header-content">
        <div className="site-header-brand">
          <Link to="/"  aria-label="Onlinestudier startsida"><img src="/img/onlinestudier-logo-dark.webp" alt="Onlinestudier" className="site-header__logo" /></Link>
          <span className="site-header__partner">I sammarbete med<img src="/img/talivo-logo.webp" alt="talivo" className="site-talivo-logo" /></span>
        </div>

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
    </header>
  );
}

export default Header;