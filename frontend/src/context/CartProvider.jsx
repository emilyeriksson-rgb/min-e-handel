import {useState} from "react";
import CartContext from "./CartContext.js";

function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product,session) => {
    const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

    setCartItems((currentItems) => {
        const existingItem = currentItems.find(
            (item) => item.courseSessionId === session.id
        );

        if (existingItem) {
            return currentItems.map((item) =>
                item.courseSessionId === session.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            );
        }

   return [
        ...currentItems,
        {
          courseSessionId: session.id,
          productId: product.id,
          title: product.title,
          price,
          imageUrl: product.image_url,
          session,
          quantity: 1,
        },
      ];
    });
  };

    const removeFromCart = (courseSessionId) => {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) => item.courseSessionId !== courseSessionId
      )
    );
  };

  const updateQuantity = (courseSessionId, quantity) => {
    if (quantity < 1) {
      removeFromCart(courseSessionId);
      return;
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.courseSessionId === courseSessionId
          ? {
              ...item,
              quantity,
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