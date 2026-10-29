import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const formatPrice = (value) =>
  Number(value).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
  });

export default function OrderConfirmationPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [retry, setRetry] = useState(0);

  if (!sessionId) {
    return (
      <main className="site-main checkout-page bokad">
        <h1>Din beställning</h1>

        <p role="alert">
          Betalningsreferensen saknas i länken.
        </p>

        <Link to="/courses">
          Tillbaka till utbildningarna
        </Link>
      </main>
    );
  }

  return (
    <OrderConfirmationContent
      key={`${sessionId}:${retry}`}
      sessionId={sessionId}
      onRetry={() => setRetry((value) => value + 1)}
    />
  );
}

function OrderConfirmationContent({ sessionId, onRetry }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let attempts = 0;

    async function load() {
      attempts += 1;
      let terminal = false;

      try {
        const api = import.meta.env.VITE_API_URL;

        const response = await fetch(
          `${api}/payments/confirmation?session_id=${encodeURIComponent(sessionId)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Kunde inte hämta ordern."
          );
        }

        if (controller.signal.aborted) return;

        setOrder(data);
        setError("");

        terminal =
          data.payment_status === "paid" ||
          data.order_status === "cancelled";
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error.message || "Kunde inte hämta ordern."
        );
      }

      if (controller.signal.aborted) return;

      if (!terminal && attempts < 30) {
        timer = setTimeout(load, 2000);
      } else {
        setWaiting(false);
      }
    }

    load();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [sessionId]);

  const paid = order?.payment_status === "paid";

  const cancelled =
    !paid && order?.order_status === "cancelled";

  return (
    <main className="site-main checkout-page bokad">
      <h1>
        {paid
          ? "Tack för din beställning!"
          : cancelled
            ? "Beställningen är avbruten"
            : "Din beställning"}
      </h1>

      <div aria-live="polite">
        {order && (
          <>
            <p>
              Ordernummer: <strong>{order.id}</strong>
            </p>

            <p>
              Status:{" "}
              <strong>
                {paid
                  ? "Betald"
                  : cancelled
                    ? "Avbruten"
                    : "Obetald – inväntar betalningsbekräftelse"}
              </strong>
            </p>

            <p>
              Totalt:{" "}
              <strong>
                {formatPrice(order.total_amount)}
              </strong>
            </p>

            <ul>
              {order.items.map((item, index) => (
                <li key={index}>
                  {item.title} — {item.quantity} st ×{" "}
                  {formatPrice(item.price_at_purchase)}
                </li>
              ))}
            </ul>
          </>
        )}

        {waiting && (
          <p>
            Vi hämtar betalningsstatus.
            Det kan ta en liten stund.
          </p>
        )}

        {!waiting && !paid && !cancelled && (
          <p>
            Betalningen är ännu inte bekräftad här.
            Uppdatera statusen innan du gör ett nytt köp.
          </p>
        )}

        {error && <p role="alert">{error}</p>}
      </div>

      {!waiting && (
        <button type="button" onClick={onRetry}>
          Uppdatera status
        </button>
      )}

      <p>
        <Link to="/courses">
          Tillbaka till utbildningarna
        </Link>
      </p>
    </main>
  );
}