import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import './styles/variables.css'
import "./styles/base.css";
import App from './App.jsx'
import CartProvider from "./context/CartProvider.jsx";
import CurrencyProvider from "./context/CurrencyProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CurrencyProvider>
      <CartProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CartProvider>
    </CurrencyProvider>
  </StrictMode>
);

