import { useContext } from "react";
import AuthContext from "../context/AuthContext.js";

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth måste användas inuti AuthProvider."
    );
  }

  return context;
}

export default useAuth;