import { useContext } from "react";
import CurrencyContext from "../context/CurrencyContext.js";

function useCurrency() {
  const context = useContext(CurrencyContext);

  if (context === null) {
    throw new Error(
      "useCurrency måste användas inom CurrencyProvider"
    );
  }

  return context;
}

export default useCurrency;