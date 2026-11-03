import { useState } from "react";
import CartContext from "./CartContext.js";

function CartProvider({ children }) {
  const [cartState, setCartState] = useState({
    items: [],
    notice: null,
  });

  const cartItems = cartState.items;
  const cartNotice = cartState.notice;

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

    const noticeId = crypto.randomUUID();

    setCartState((current) => {
      const existingItem = current.items.find(
        (item) => item.id === id
      );

      const quantity = existingItem
        ? Math.min(existingItem.quantity + 1, maxQuantity)
        : 1;

      // Visa ingen ny bekräftelse om inget kunde läggas till.
      if (
        existingItem &&
        quantity <= existingItem.quantity
      ) {
        return current;
      }

      const items = existingItem
        ? current.items.map((item) =>
            item.id === id
              ? { ...item, quantity, maxQuantity }
              : item
          )
        : [
            ...current.items,
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
              quantity,
              maxQuantity,
            },
          ];

      return {
        items,
        notice: {
          id: noticeId,
          title: product.title,
          quantity,
        },
      };
    });
  };

  const removeFromCart = (id) => {
    setCartState((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
    }));
  };

  const updateQuantity = (id, quantity) => {
    if (!Number.isSafeInteger(quantity)) {
      return;
    }

    if (quantity < 1) {
      removeFromCart(id);
      return;
    }

    setCartState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.min(quantity, item.maxQuantity),
            }
          : item
      ),
    }));
  };

  const clearCart = () => {
    setCartState({
      items: [],
      notice: null,
    });
  };

  const dismissCartNotice = () => {
    setCartState((current) =>
      current.notice
        ? { ...current, notice: null }
        : current
    );
  };

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        cartNotice,
        dismissCartNotice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export default CartProvider;