import { Fragment, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/api.js";

const fields = [
  {
    name: "first_name",
    label: "Förnamn",
    type: "text",
    autoComplete: "given-name",
    maxLength: 100,
  },
  {
    name: "last_name",
    label: "Efternamn",
    type: "text",
    autoComplete: "family-name",
    maxLength: 100,
  },
  {
    name: "email",
    label: "E-postadress",
    type: "email",
    autoComplete: "email",
    maxLength: 254,
  },
  {
    name: "password",
    label: "Lösenord, minst 12 tecken",
    type: "password",
    autoComplete: "new-password",
    minLength: 12,
    maxLength: 128,
  },
];

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      await registerUser(form);

      navigate("/logga-in", {
        replace: true,
        state: { registered: true },
      });
    } catch (error) {
      setError(
        error.message || "Kontot kunde inte skapas."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="site-main checkout-page bokad">
      <h1>Skapa konto</h1>

      <form onSubmit={handleSubmit}>
        <section>
          {fields.map((field) => (
            <Fragment key={field.name}>
              <label htmlFor={`register-${field.name}`}>
                {field.label}
              </label>

              <input
                id={`register-${field.name}`}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                minLength={field.minLength}
                maxLength={field.maxLength}
                value={form[field.name]}
                required
                disabled={isSubmitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field.name]: event.target.value,
                  }))
                }
              />
            </Fragment>
          ))}

          {error && <p role="alert">{error}</p>}

          <button
            type="submit"
            className="btn-style"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Skapar konto..." : "Skapa konto"}
          </button>
        </section>
      </form>

      <p>
        Har du redan ett konto?{" "}
        <Link to="/logga-in">Logga in</Link>
      </p>
    </main>
  );
}

export default RegisterPage;