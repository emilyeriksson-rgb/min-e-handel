import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useCart from "../hooks/useCart.js";
import { createOrder } from "../api/api.js";
import useCurrency from "../hooks/useCurrency.js";

function CheckoutPage() {
  const {
    cartItems,
    cartTotal,
  } = useCart();
  const { currency, rates } = useCurrency();
  const [searchParams] = useSearchParams();
  const paymentCancelled = searchParams.get("cancelled") === "1";
  const submittingRef = useRef(false);

  const [billingRecipient, setBillingRecipient] =
    useState({
      name: "",
      email: "",
      company_name: "",
      organization_number: "",
      address: "",
      postal_code: "",
      city: "",
    });

  const [
    participantsBySession,
    setParticipantsBySession,
  ] = useState(() =>
    Object.fromEntries(
      cartItems.map((item) => [
        item.courseSessionId,

        Array.from(
          { length: item.quantity },
          () => ({
            first_name: "",
            last_name: "",
            email: "",
            sameAsInvoice: false,
          })
        ),
      ])
    )
  );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");



const formatPrice = (priceInSek) => {
  const amount = Number(priceInSek);

  const sekPrice = amount.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
  });

  if (currency === "SEK") {
    return sekPrice;
  }

  const rate = rates[currency];

  if (rate === undefined) {
    return sekPrice;
  }

  const convertedPrice = (amount * rate).toLocaleString("sv-SE", {
    style: "currency",
    currency,
  });

  return `${sekPrice} ≈ ${convertedPrice}`;
};

  const handleBillingChange = (event) => {
    const { name, value } = event.target;

    setBillingRecipient((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateParticipant = (
    courseSessionId,
    participantIndex,
    field,
    value
  ) => {
    setParticipantsBySession((current) => ({
      ...current,

      [courseSessionId]: current[
        courseSessionId
      ].map((participant, index) =>
        index === participantIndex
          ? {
              ...participant,
              [field]: value,
            }
          : participant
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;

    setIsSubmitting(true);
    setError("");

    try {
      const items = cartItems.map((item) => ({
        course_session_id: item.courseSessionId,

        participants: participantsBySession[
          item.courseSessionId
        ].map((participant) => ({
          email: participant.sameAsInvoice
            ? billingRecipient.email
            : participant.email,

          first_name: participant.first_name,
          last_name: participant.last_name,
        })),
      }));

      for (const item of items) {
  const participantEmails = item.participants.map(
    (participant) =>
      participant.email.trim().toLowerCase()
  );

  const uniqueEmails = new Set(participantEmails);

  if (uniqueEmails.size !== participantEmails.length) {
    throw new Error(
      "Varje deltagare på samma utbildning måste ha en unik e-postadress."
    );
  }
}

      const result = await createOrder({
        billing_recipient: billingRecipient,
        items,
      });

      if (typeof result.checkout_url !== "string" || !result.checkout_url) {
        throw new Error("Betalningslänken saknas. Din order kan redan vara skapad. Kontakta oss innan du gör en ny beställning.");
      }

      const checkoutUrl = new URL(result.checkout_url);
      if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
        throw new Error("En ogiltig betalningslänk returnerades.");
      }

      window.location.assign(checkoutUrl.href);
    } catch (error) {
      setError(error.message || "Betalningen kunde inte startas. Försök igen senare.");
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
<main className="site-main checkout-page bokad">
          <h1>Slutför bokning</h1>

        {paymentCancelled && (
          <p role="status">Du har lämnat betalningen. Den tidigare ordern avbryts när betalningssessionen löper ut, om den inte har betalats.</p>
        )}
        <p>Din varukorg är tom.</p>

        <Link to="/courses">
          Hitta utbildningar
        </Link>
      </main>
    );
  }

  return (
<main className="site-main checkout-page">     
   <h1>Slutför bokning</h1>

      {paymentCancelled && (
        <p role="status">Du har lämnat betalningen. Den tidigare ordern avbryts när betalningssessionen löper ut, om den inte har betalats.</p>
      )}
      <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <section>
          <h2>Beställaruppgifter</h2>

          <label htmlFor="invoice-email">
            Beställarens e-postadress *
          </label>

          <input
            id="invoice-email"
            type="email"
            name="email"
            autoComplete="section-billing email"
            value={billingRecipient.email}
            onChange={handleBillingChange}
            required
          />

          <label htmlFor="invoice-name">
            Namn
          </label>

          <input
            id="invoice-name"
            type="text"
            name="name"
            autoComplete="section-billing name"
            value={billingRecipient.name}
            onChange={handleBillingChange}
          />

          <h3>
            Företagsinformation
          </h3>

          <p>
            Fyll i dessa uppgifter om du beställer åt ett företag.
          </p>

          <label htmlFor="company-name">
            Företagsnamn
          </label>

          <input
            id="company-name"
            type="text"
            name="company_name"
            value={billingRecipient.company_name}
            onChange={handleBillingChange}
          />

          <label htmlFor="organization-number">
            Organisationsnummer
          </label>

          <input
            id="organization-number"
            type="text"
            name="organization_number"
            value={
              billingRecipient.organization_number
            }
            onChange={handleBillingChange}
          />

          <label htmlFor="invoice-address">
            Adress
          </label>

          <input
            id="invoice-address"
            type="text"
            name="address"
            value={billingRecipient.address}
            onChange={handleBillingChange}
          />

          <label htmlFor="postal-code">
            Postnummer
          </label>

          <input
            id="postal-code"
            type="text"
            name="postal_code"
            value={billingRecipient.postal_code}
            onChange={handleBillingChange}
          />

          <label htmlFor="invoice-city">
            Ort
          </label>

          <input
            id="invoice-city"
            type="text"
            name="city"
            value={billingRecipient.city}
            onChange={handleBillingChange}
          />
        </section>

        <section>
          <h2>Deltagare</h2>
          <p>
  Varje deltagare på samma utbildning måste ha en
  unik e-postadress.
</p>

          {cartItems.map((item) => (
            <fieldset key={item.courseSessionId}>
              <legend>{item.title}</legend>

              {item.session?.start_date && (
                <p>
                  Datum:{" "}
                  {new Date(
                    item.session.start_date
                  ).toLocaleDateString("sv-SE")}
                </p>
              )}

              {item.session?.city && (
                <p>
                  Ort: {item.session.city}
                </p>
              )}

              {participantsBySession[
                item.courseSessionId
              ].map((participant, index) => (
                <div
                  key={`${item.courseSessionId}-${index}`}
                  className="participant-fields"
                >
                  <h3>
                    Deltagare {index + 1}
                  </h3>

                  <label>
                    <input
                      type="checkbox"
                      checked={
                        participant.sameAsInvoice
                      }
                      onChange={(event) =>
                        updateParticipant(
                          item.courseSessionId,
                          index,
                          "sameAsInvoice",
                          event.target.checked
                        )
                      }
                    />

                    Samma e-postadress som
                    beställaren
                  </label>

                  <label
                    htmlFor={`participant-email-${item.courseSessionId}-${index}`}
                  >
                    Deltagarens e-postadress *
                  </label>

                  <input
                    id={`participant-email-${item.courseSessionId}-${index}`}
                    type="email"
                    value={
                      participant.sameAsInvoice
                        ? billingRecipient.email
                        : participant.email
                    }
                   readOnly={participant.sameAsInvoice}
                    required
                    onChange={(event) =>
                      updateParticipant(
                        item.courseSessionId,
                        index,
                        "email",
                        event.target.value
                      )
                    }
                  />

                  <label
                    htmlFor={`participant-first-name-${item.courseSessionId}-${index}`}
                  >
                    Förnamn
                  </label>

                 <input
  id={`participant-first-name-${item.courseSessionId}-${index}`}
  name={`participant-${item.courseSessionId}-${index}-first-name`}
  type="text"
  autoComplete={`section-participant-${item.courseSessionId}-${index} given-name`}
  value={participant.first_name}
  onChange={(event) =>
    updateParticipant(
      item.courseSessionId,
      index,
      "first_name",
      event.target.value
    )
  }
/>

                  <label
                    htmlFor={`participant-last-name-${item.courseSessionId}-${index}`}
                  >
                    Efternamn
                  </label>

                 <input
  id={`participant-last-name-${item.courseSessionId}-${index}`}
  name={`participant-${item.courseSessionId}-${index}-last-name`}
  type="text"
  autoComplete={`section-participant-${item.courseSessionId}-${index} family-name`}
  value={participant.last_name}
  onChange={(event) =>
    updateParticipant(
      item.courseSessionId,
      index,
      "last_name",
      event.target.value
    )
  }
/>
                </div>
              ))}
            </fieldset>
          ))}
        </section>

        <section>
          <h2>Sammanställning</h2>
          <p>Valutaomräknade priser är ungefärliga. Betalning sker i SEK. Slutbeloppet visas hos Stripe.
          </p>

          <p>
            Totalt:{" "}
            <strong>
              {formatPrice(cartTotal)}
            </strong>
          </p>

          {error && (
            <p role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Öppnar betalningen..."
              : "Gå till betalning"}
          </button>
        </section>
      </form>
    </main>
  );
}

export default CheckoutPage;