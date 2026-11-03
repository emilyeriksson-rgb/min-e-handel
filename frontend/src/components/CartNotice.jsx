import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { FiShoppingCart } from "react-icons/fi";
import useCart from "../hooks/useCart.js";

import "../styles/OwlContact.css";
import "../styles/CartNotice.css";

function CartNotice() {
  const { cartNotice, dismissCartNotice } = useCart();
  const previousFocus = useRef(null);

  useEffect(() => {
    if (cartNotice) {
      previousFocus.current = document.activeElement;
    }
  }, [cartNotice]);

  const handleClose = () => {
    dismissCartNotice();

    if (previousFocus.current?.isConnected) {
      previousFocus.current.focus({ preventScroll: true });
    }
  };

  return createPortal(
    <>
      <div
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {cartNotice
          ? `${cartNotice.title} har lagts i varukorgen. Antal: ${cartNotice.quantity}.`
          : ""}
      </div>

      {cartNotice && (
        <aside
          key={cartNotice.id}
          className="owl-contact__bubble cart-notice"
          aria-label="Tillagd i varukorgen"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              handleClose();
            }
          }}
        >
          <button
            type="button"
            className="owl-contact__close"
            aria-label="Stäng varukorgsmeddelandet"
            onClick={handleClose}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>

          <p>
            <strong>{cartNotice.title}</strong>
            <br />
            har lagts i varukorgen.
          </p>

          <Link
            to="/cart"
            className="owl-contact__mail"
            onClick={dismissCartNotice}
          >
            <FiShoppingCart aria-hidden="true" />
            Till varukorgen
          </Link>
        </aside>
      )}
    </>,
    document.body
  );
}

export default CartNotice;