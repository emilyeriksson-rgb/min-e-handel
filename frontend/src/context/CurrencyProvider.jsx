import { useEffect, useState } from "react";
import CurrencyContext from "./CurrencyContext.js";
import { fetchCurrencyRates } from "../api/api.js";

function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState("SEK");
  const [rates, setRates] = useState({ SEK: 1 });
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  let active = true;

  async function loadRates() {
    try {
      const data = await fetchCurrencyRates();

      if (active) {
        setRates(data.rates);
      }
    } catch (error) {
      if (active) {
        setError(error.message);
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }

  loadRates();

  return () => {
    active = false;
  };
}, []);

const value = {
  currency,
  setCurrency,
  rates,
  loading,
  error,
};

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export default CurrencyProvider;