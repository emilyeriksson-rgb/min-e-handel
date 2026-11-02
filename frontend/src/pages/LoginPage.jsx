import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

function LoginPage({ admin = false }) {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const text = admin
    ? {
        title: "Admin sign in",
        email: "Email",
        password: "Password",
        submit: "Sign in",
        submitting: "Signing in...",
        invalid: "Incorrect email or password.",
        unavailable: "Sign-in is unavailable. Please try again.",
      }
    : {
        title: "Logga in",
        email: "E-postadress",
        password: "Lösenord",
        submit: "Logga in",
        submitting: "Loggar in...",
        invalid: "Fel e-postadress eller lösenord.",
        unavailable: "Inloggningen fungerar inte just nu. Försök igen.",
      };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting || loading) return;

    setIsSubmitting(true);
    setError("");

    try {
      const user = await login({ email, password });

      if (admin && user.role !== "admin") {
        setError(
          "This account does not have administrator access."
        );
        return;
      }

      const from = location.state?.from;

      const adminDestination =
        typeof from === "string" &&
        (from === "/admin" || from.startsWith("/admin/"))
          ? from
          : "/admin";

      navigate(
        admin ? adminDestination : "/mitt-konto",
        { replace: true }
      );

    } catch (error) {
      if (error.code === "RATE_LIMITED") {
        setError(
          admin
            ? "Too many sign-in attempts. Please wait before trying again."
            : "För många inloggningsförsök. Vänta en stund och försök igen."
        );
      } else {
        setError(
          ["INVALID_CREDENTIALS", "INVALID_LOGIN"].includes(error.code)
            ? text.invalid
            : text.unavailable
        );
      }
    }
    finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="site-main checkout-page bokad">
      <h1>{text.title}</h1>

      {!admin && location.state?.registered && (
        <p role="status">
          Ditt konto har skapats. Du kan nu logga in.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <section>
          <label htmlFor="login-email">{text.email}</label>

          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
            disabled={isSubmitting}
          />

          <label htmlFor="login-password">{text.password}</label>

          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={12}
            maxLength={128}
            required
            disabled={isSubmitting}
          />

          {error && <p role="alert">{error}</p>}

          <button
            type="submit"
            className="btn-style"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? text.submitting : text.submit}
          </button>
        </section>
      </form>

      {!admin && (
        <p>
          Inget konto?{" "}
          <Link to="/registrera">Skapa ett konto</Link>
        </p>
      )}

      <p>
        <Link to="/">
          {admin ? "View shop" : "Tillbaka till shoppen"}
        </Link>
      </p>
    </main>
  );
}

export default LoginPage;