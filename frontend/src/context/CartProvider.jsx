import { useState } from "react";
import CartContext from "./CartContext.js";

function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Kurser skickar ett kurstillfälle.
  // Böcker skickas utan kurstillfälle.
  const addToCart = (product, session) => {
    const isBook = !session;

    if (
      isBook &&
      (typeof product.sku !== "string" || !product.sku.trim())
    ) {
      return;
    }

    const maxQuantity = isBook
      ? Math.min(99, Number(product.stock))
      : 999;

    if (
      !Number.isInteger(maxQuantity) ||
      maxQuantity < 1
    ) {
      return;
    }

    const id = isBook
      ? `book:${product.sku}`
      : `course:${session.id}`;

    const price = Number(
      product.is_on_sale && product.sale_price != null
        ? product.sale_price
        : product.price
    );

    if (!Number.isFinite(price) || price < 0) {
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id === id
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === id
            ? {
                ...item,
                maxQuantity,
                quantity: Math.min(
                  item.quantity + 1,
                  maxQuantity
                ),
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          id,
          type: isBook ? "book" : "course",
          sku: isBook ? product.sku : null,
          courseSessionId: isBook ? null : session.id,
          productId: product.id,
          title: product.title,
          price,
          imageUrl: product.image_url,
          session: session ?? null,
          quantity: 1,
          maxQuantity,
        },
      ];
    });
  };

  const removeFromCart = (id) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );
  };

  const updateQuantity = (id, quantity) => {
    if (!Number.isSafeInteger(quantity)) {
      return;
    }

    if (quantity < 1) {
      removeFromCart(id);
      return;
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.min(
                quantity,
                item.maxQuantity
              ),
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export default CartProvider;