import { useState } from "react";
import { Link } from "react-router-dom";
import useCart from "../hooks/useCart.js";
import { createOrder } from "../api/api.js";

function CheckoutPage() {
  const {
    cartItems,
    cartTotal,
    clearCart,
  } = useCart();

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

  const [createdOrder, setCreatedOrder] =
    useState(null);

  const formatPrice = (price) =>
    Number(price).toLocaleString("sv-SE", {
      style: "currency",
      currency: "SEK",
    });

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

      setCreatedOrder(result.order);
      clearCart();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdOrder) {
    return (
      <main>
        <h1>Tack för din bokning!</h1>

        <p>
          Din order har skapats med ordernummer{" "}
          <strong>{createdOrder.id}</strong>.
        </p>

        <p>
          Fakturanummer:{" "}
          <strong>
            {createdOrder.invoice_number}
          </strong>
        </p>

        <p>
          Totalt:{" "}
          <strong>
            {formatPrice(createdOrder.total_amount)}
          </strong>
        </p>

        <Link to="/courses">
          Hitta fler utbildningar
        </Link>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main>
        <h1>Slutför bokning</h1>

        <p>Din varukorg är tom.</p>

        <Link to="/courses">
          Hitta utbildningar
        </Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Slutför bokning</h1>

      <form onSubmit={handleSubmit}>
        <section>
          <h2>Fakturauppgifter</h2>

          <label htmlFor="invoice-email">
            E-post för faktura *
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
            Fyll i dessa uppgifter vid fakturering
            till företag.
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
            Fakturaadress
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
                    fakturamottagaren
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
              ? "Skapar order..."
              : "Slutför bokningen"}
          </button>
        </section>
      </form>
    </main>
  );
}

export default CheckoutPage;