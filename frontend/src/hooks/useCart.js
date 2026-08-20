import { useContext } from "react";
import CartContext from "../context/CartContext.js";

function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart måste användas inuti CartProvider"
    );
  }

  return context;
}

export default useCart;