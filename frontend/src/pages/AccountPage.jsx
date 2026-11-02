import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { fetchMyOrders } from "../api/api.js";

const orderStatusLabels = {
  new: "Mottagen",
  processing: "Behandlas",
  completed: "Slutförd",
  cancelled: "Avbruten",
};

const paymentStatusLabels = {
  unpaid: "Obetald",
  paid: "Betald",
  overdue: "Förfallen",
  refunded: "Återbetald",
};

const shippingMethodLabels = {
  none: "Ingen frakt",
  service_point: "Ombud",
  home: "Hemleverans",
};

const formatPrice = (value) =>
  Number(value).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
  });

function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [history, setHistory] = useState(null);
  const [retry, setRetry] = useState(0);

  const userId = user?.id;
  const requestKey = `${userId}:${retry}`;

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    async function loadOrders() {
      try {
        const orders = await fetchMyOrders(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setHistory({
            key: requestKey,
            orders,
            error: "",
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setHistory({
            key: requestKey,
            orders: [],
            error: error.name === "TimeoutError"
              ? "Anropet tog för lång tid. Försök igen."
              : error.message ||
                "Kunde inte hämta dina beställningar.",
          });
        }
      }
    }

    loadOrders();

    return () => controller.abort();
  }, [userId, requestKey]);

  const handleLogout = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      setError("Utloggningen misslyckades. Försök igen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const historyReady = history?.key === requestKey;
  const orders = historyReady ? history.orders : [];

  return (
    <main className="site-main checkout-page bokad">
      <h1>Mitt konto</h1>

      <section>
        <h2>
          {user.first_name} {user.last_name}
        </h2>

        <p>{user.email}</p>

        <p>
          Kontotyp:{" "}
          {user.role === "admin" ? "Administratör" : "Kund"}
        </p>

        {user.role === "admin" && (
          <p>
            <Link to="/admin" className="btn-style">
              Öppna admin
            </Link>
          </p>
        )}

        {error && <p role="alert">{error}</p>}

        <button
          type="button"
          className="btn-style"
          onClick={handleLogout}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Loggar ut..." : "Logga ut"}
        </button>
      </section>

      <section>
        <h2>Mina beställningar</h2>

        <p>
          Här visas dina senaste 50 beställningar
          som gjordes när du var inloggad.
        </p>

        {!historyReady && (
          <p role="status">Hämtar beställningar...</p>
        )}

        {historyReady && history.error && (
          <p role="alert">{history.error}</p>
        )}

        {historyReady &&
          !history.error &&
          orders.length === 0 && (
            <p>Du har inga beställningar kopplade till kontot ännu.</p>
          )}

        {orders.map((order) => (
          <article key={order.id}>
            <h3>Beställning #{order.id}</h3>

            <p>
              Datum:{" "}
              {new Date(order.created_at).toLocaleDateString(
                "sv-SE",
                { timeZone: "Europe/Stockholm" }
              )}
            </p>

            <p>
              Orderstatus:{" "}
              {orderStatusLabels[order.order_status] ??
                "Okänd status"}
            </p>

            <p>
              Betalning:{" "}
              {paymentStatusLabels[order.payment_status] ??
                "Okänd status"}
            </p>

            {order.shipping_method !== "none" && (
              <>
                <p>
                  Leverans:{" "}
                  {shippingMethodLabels[order.shipping_method] ??
                    "Ej angiven"}
                </p>

                <p>
                  Frakt:{" "}
                  {Number(order.shipping_price) === 0
                    ? "Fri frakt"
                    : formatPrice(order.shipping_price)}
                </p>
              </>
            )}

            {order.shipping_service_point && (
              <p>
                Ombud: {order.shipping_service_point.name}
                {", "}
                {order.shipping_service_point.address}
                {", "}
                {order.shipping_service_point.postalCode}{" "}
                {order.shipping_service_point.city}
              </p>
            )}

            <p>
              Totalt inklusive eventuell frakt:{" "}
              <strong>{formatPrice(order.total_amount)}</strong>
            </p>
          </article>
        ))}

        <button
          type="button"
          className="btn-style"
          onClick={() => setRetry((value) => value + 1)}
          disabled={!historyReady || isSubmitting}
        >
          Uppdatera beställningar
        </button>
      </section>
    </main>
  );
}

export default AccountPage;