import { Link, Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import Loader from "./Loader.jsx";

function RequireAuth({ children, admin = false }) {
  const { user, loading, error } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Loader
        message={admin ? "Checking sign-in..." : "Kontrollerar inloggning..."}
      />
    );
  }

  if (error) {
    return (
      <main className="site-main checkout-page bokad">
        <p role="alert">
          {admin
            ? "Sign-in status could not be checked. Please reload the page."
            : error}
        </p>

        <button
          type="button"
          className="btn-style"
          onClick={() => window.location.reload()}
        >
          {admin ? "Reload" : "Ladda om"}
        </button>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={admin ? "/admin/login" : "/logga-in"}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (admin && user.role !== "admin") {
    return (
      <main className="site-main checkout-page bokad">
        <h1>Access denied</h1>
        <p>This account does not have administrator access.</p>
        <Link to="/mitt-konto">Go to your account</Link>
      </main>
    );
  }

  return children;
}

export default RequireAuth;