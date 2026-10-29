import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useCart from "../hooks/useCart.js";
import useCurrency from "../hooks/useCurrency.js";
import {
  createOrder,
  fetchShippingQuote,
  fetchServicePoints,
  fetchDeliveryEstimate,
} from "../api/api.js";

function createParticipant() {
  return {
    first_name: "",
    last_name: "",
    email: "",
    sameAsInvoice: false,
  };
}

function formatDeliveryDate(date) {
  return new Date(
    `${date.slice(0, 10)}T12:00:00Z`
  ).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    timeZone: "Europe/Stockholm",
  });
}

// Gemensam hämtning med avbrytning och skydd mot gamla svar.
function useCheckoutRequest(request) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  const requestKey = JSON.stringify({ request, attempt });

  useEffect(() => {
    const { request: currentRequest } = JSON.parse(requestKey);

    if (!currentRequest) return;

    const controller = new AbortController();

    async function load() {
      try {
        let data;

        if (currentRequest.kind === "quote") {
          data = await fetchShippingQuote(
            currentRequest.body,
            controller.signal
          );
        } else if (currentRequest.kind === "points") {
          data = await fetchServicePoints(
            currentRequest.postalCode,
            controller.signal
          );
        } else {
          data = await fetchDeliveryEstimate(
            currentRequest.postalCode,
            currentRequest.method,
            controller.signal
          );
        }

        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            data,
            error: "",
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            data: null,
            error: error.name === "TimeoutError"
              ? "Anropet tog för lång tid. Försök igen."
              : error.message || "Kunde inte hämta uppgifterna.",
          });
        }
      }
    }

    load();

    return () => controller.abort();
  }, [requestKey]);

  const current =
    request !== null &&
    result?.key === requestKey;

  return {
    data: current ? result.data : null,
    error: current ? result.error : "",
    loading: request !== null && !current,
    reload: () => setAttempt((value) => value + 1),
  };
}

function CheckoutPage() {
  const { cartItems } = useCart();
  const { currency, rates } = useCurrency();

  const [searchParams] = useSearchParams();
  const paymentCancelled =
    searchParams.get("cancelled") === "1";

  const submittingRef = useRef(false);

  const [billingRecipient, setBillingRecipient] = useState({
    name: "",
    email: "",
    company_name: "",
    organization_number: "",
    address: "",
    postal_code: "",
    city: "",
  });

  const [participantsBySession, setParticipantsBySession] =
    useState({});

  const [shippingMethod, setShippingMethod] =
    useState("service_point");

  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const courses = cartItems.filter(
    (item) => item.type === "course"
  );

  const books = cartItems.filter(
    (item) => item.type === "book"
  );

  const hasBooks = books.length > 0;

  const postalCode = billingRecipient.postal_code
    .trim()
    .replace(/\s/g, "");

  const postalCodeValid = /^\d{3}\s?\d{2}$/.test(
    billingRecipient.postal_code.trim()
  );

  const quote = useCheckoutRequest(
    cartItems.length > 0
      ? {
          kind: "quote",
          body: {
            items: courses.map((item) => ({
              course_session_id: item.courseSessionId,
              quantity: item.quantity,
            })),
            books: books.map((item) => ({
              sku: item.sku,
              quantity: item.quantity,
            })),
          },
        }
      : null
  );

  const points = useCheckoutRequest(
    hasBooks &&
    shippingMethod === "service_point" &&
    postalCodeValid
      ? {
          kind: "points",
          postalCode,
        }
      : null
  );

  const estimate = useCheckoutRequest(
    hasBooks && postalCodeValid
      ? {
          kind: "estimate",
          postalCode,
          method: shippingMethod,
        }
      : null
  );

  const servicePoints = Array.isArray(
    points.data?.servicePoints
  )
    ? points.data.servicePoints
    : [];

  const selectedServicePoint = selectedPoint &&
    selectedPoint.postalCode === postalCode
    ? servicePoints.find(
        (point) =>
          point.id === selectedPoint.id &&
          point.countryCode === selectedPoint.countryCode
      )
    : null;

  const selectedMethod = hasBooks
    ? shippingMethod
    : "none";

  const shippingOption =
    quote.data?.shippingOptions?.find(
      (option) => option.method === selectedMethod
    );

  const canSubmit =
    Boolean(shippingOption) &&
    !quote.loading &&
    !isSubmitting &&
    (
      !hasBooks ||
      (
        postalCodeValid &&
        estimate.data?.available === true &&
        (
          shippingMethod === "home" ||
          Boolean(selectedServicePoint)
        )
      )
    );

  const formatPrice = (priceInSek) => {
    const amount = Number(priceInSek);

    const sekPrice = amount.toLocaleString("sv-SE", {
      style: "currency",
      currency: "SEK",
    });

    if (
      currency === "SEK" ||
      rates[currency] === undefined
    ) {
      return sekPrice;
    }

    const convertedPrice = (
      amount * rates[currency]
    ).toLocaleString("sv-SE", {
      style: "currency",
      currency,
    });

    return `${sekPrice} ≈ ${convertedPrice}`;
  };

  const handleBillingChange = (event) => {
    const { name, value } = event.target;

    if (name === "postal_code") {
      setSelectedPoint(null);
    }

    setBillingRecipient((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const getParticipants = (
    item,
    current = participantsBySession
  ) =>
    Array.from(
      { length: item.quantity },
      (_, index) =>
        current[item.courseSessionId]?.[index] ??
        createParticipant()
    );

  const updateParticipant = (
    item,
    participantIndex,
    field,
    value
  ) => {
    setParticipantsBySession((current) => ({
      ...current,
      [item.courseSessionId]: getParticipants(
        item,
        current
      ).map((participant, index) =>
        index === participantIndex
          ? { ...participant, [field]: value }
          : participant
      ),
    }));
  };

  const renderBillingField = (
    name,
    label,
    {
      type = "text",
      required = false,
      autoComplete,
      maxLength = 255,
    } = {}
  ) => (
    <>
      <label htmlFor={`billing-${name}`}>
        {label}{required ? " *" : ""}
      </label>

      <input
        id={`billing-${name}`}
        type={type}
        name={name}
        value={billingRecipient[name]}
        onChange={handleBillingChange}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        disabled={isSubmitting}
        inputMode={name === "postal_code" ? "numeric" : undefined}
        pattern={
          name === "postal_code" && hasBooks
            ? "[0-9]{3} ?[0-9]{2}"
            : undefined
        }
      />
    </>
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submittingRef.current) return;

    if (!canSubmit) {
      setError(
        "Vänta tills pris och leverans är hämtade och välj ombud om det behövs."
      );
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const items = courses.map((item) => ({
        course_session_id: item.courseSessionId,
        participants: getParticipants(item).map(
          (participant) => ({
            email: (
              participant.sameAsInvoice
                ? billingRecipient.email
                : participant.email
            ).trim(),
            first_name: participant.first_name,
            last_name: participant.last_name,
          })
        ),
      }));

      for (const item of items) {
        const emails = item.participants.map(
          (participant) =>
            participant.email.toLowerCase()
        );

        if (new Set(emails).size !== emails.length) {
          throw new Error(
            "Varje deltagare på samma utbildning måste ha en unik e-postadress."
          );
        }
      }

      const payload = {
        billing_recipient: billingRecipient,
        items,
        books: books.map((book) => ({
          sku: book.sku,
          quantity: book.quantity,
        })),
      };

      if (hasBooks) {
        payload.shipping = {
          method: shippingMethod,
          countryCode: "SE",
          address: {
            name: billingRecipient.name.trim(),
            street: billingRecipient.address.trim(),
            postalCode,
            city: billingRecipient.city.trim(),
          },
        };

        if (shippingMethod === "service_point") {
          payload.shipping.servicePointId =
            selectedServicePoint.id;
        }
      }

      // Inga priser eller ombudsadresser skickas från React.
      const result = await createOrder(payload);

      if (
        typeof result.checkout_url !== "string" ||
        !result.checkout_url
      ) {
        throw new Error(
          "Betalningslänken saknas. Din order kan redan vara skapad. Kontakta oss innan du gör en ny beställning."
        );
      }

      const checkoutUrl = new URL(result.checkout_url);

      if (
        checkoutUrl.protocol !== "https:" ||
        checkoutUrl.hostname !== "checkout.stripe.com"
      ) {
        throw new Error(
          "En ogiltig betalningslänk returnerades."
        );
      }

      window.location.assign(checkoutUrl.href);
    } catch (error) {
      setError(
        error.message ||
        "Betalningen kunde inte startas. Försök igen senare."
      );
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const cancellationMessage = paymentCancelled && (
    <p role="status">
      Du har lämnat betalningen. Den tidigare ordern
      avbryts när betalningssessionen löper ut,
      om den inte har betalats.
    </p>
  );

  if (cartItems.length === 0) {
    return (
      <main className="site-main checkout-page bokad">
        <h1>Slutför beställning</h1>
        {cancellationMessage}
        <p>Din varukorg är tom.</p>
        <Link to="/courses">Hitta utbildningar och böcker</Link>
      </main>
    );
  }

  return (
    <main className="site-main checkout-page">
      <h1>
        {hasBooks ? "Slutför beställning" : "Slutför bokning"}
      </h1>

      {cancellationMessage}

      <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <section>
          <h2>Beställaruppgifter</h2>

          {hasBooks && (
            <p>
              Namn och adress används även för bokleveransen.
            </p>
          )}

          {renderBillingField("email", "Beställarens e-postadress", {
            type: "email",
            required: true,
            autoComplete: "section-billing email",
          })}

          {renderBillingField("name", "Namn", {
            required: hasBooks,
            maxLength: 200,
            autoComplete: "section-billing name",
          })}

          <h3>Företagsinformation</h3>
          <p>
            Fyll i dessa uppgifter om du beställer åt ett företag.
          </p>

          {renderBillingField("company_name", "Företagsnamn")}

          {renderBillingField(
            "organization_number",
            "Organisationsnummer",
            { maxLength: 50 }
          )}

          {renderBillingField("address", "Adress", {
            required: hasBooks,
            maxLength: 200,
            autoComplete: "section-billing address-line1",
          })}

          {renderBillingField("postal_code", "Postnummer", {
            required: hasBooks,
            maxLength: 6,
            autoComplete: "section-billing postal-code",
          })}

          {renderBillingField("city", "Ort", {
            required: hasBooks,
            maxLength: 100,
            autoComplete: "section-billing address-level2",
          })}
        </section>

        {hasBooks && (
          <section>
            <h2>Leverans</h2>

            <fieldset disabled={isSubmitting}>
              <legend>Fraktalternativ</legend>

              {["service_point", "home"].map((method) => {
                const option = quote.data?.shippingOptions?.find(
                  (item) => item.method === method
                );

                return (
                  <label key={method}>
                    <input
                      type="radio"
                      name="shipping-method"
                      value={method}
                      checked={shippingMethod === method}
                      onChange={() => {
                        setShippingMethod(method);
                        setSelectedPoint(null);
                      }}
                    />

                    {method === "service_point"
                      ? "Ombud"
                      : "Hemleverans"}

                    {" – "}

                    {option
                      ? option.priceOre === 0
                        ? "Fri frakt"
                        : formatPrice(option.priceOre / 100)
                      : "Priset hämtas"}
                  </label>
                );
              })}
            </fieldset>

            {!postalCodeValid && (
              <p>
                Ange ett postnummer med fem siffror
                under Beställaruppgifter för att se leveransen.
              </p>
            )}

            {shippingMethod === "service_point" &&
              postalCodeValid && (
                <>
                  {points.loading && (
                    <p role="status">Hämtar ombud…</p>
                  )}

                  {points.error && (
                    <>
                      <p role="alert">{points.error}</p>
                      <button
                        type="button"
                        onClick={points.reload}
                        disabled={isSubmitting}
                      >
                        Försök hämta ombud igen
                      </button>
                    </>
                  )}

                  {!points.loading &&
                    !points.error &&
                    servicePoints.length === 0 && (
                      <p>Inga ombud hittades för postnumret.</p>
                    )}

                  {servicePoints.length > 0 && (
                    <>
                      <label htmlFor="service-point">
                        Välj ombud *
                      </label>

                      <select
                        id="service-point"
                        value={selectedServicePoint?.id ?? ""}
                        required
                        disabled={isSubmitting}
                        onChange={(event) => {
                          const point = servicePoints.find(
                            (item) => item.id === event.target.value
                          );

                          setSelectedPoint(
                            point
                              ? {
                                  id: point.id,
                                  countryCode: point.countryCode,
                                  postalCode,
                                }
                              : null
                          );
                        }}
                      >
                        <option value="">Välj ett ombud</option>

                        {servicePoints.map((point) => (
                          <option
                            key={`${point.countryCode}:${point.id}`}
                            value={point.id}
                          >
                            {point.name} – {point.address},{" "}
                            {point.postalCode} {point.city}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </>
              )}

            {estimate.loading && (
              <p role="status">Beräknar leveranstid…</p>
            )}

            {estimate.error && (
              <>
                <p role="alert">{estimate.error}</p>
                <button
                  type="button"
                  onClick={estimate.reload}
                  disabled={isSubmitting}
                >
                  Försök beräkna leveransen igen
                </button>
              </>
            )}

            {estimate.data?.available === false && (
              <>
                <p role="status">{estimate.data.message}</p>
                <button
                  type="button"
                  onClick={estimate.reload}
                  disabled={isSubmitting}
                >
                  Försök beräkna leveransen igen
                </button>
              </>
            )}

            {estimate.data?.available === true && (
              <>
                <p role="status">
                  Beräknad leverans:{" "}
                  <strong>
                    {estimate.data.arrivalDate
                      ? formatDeliveryDate(
                          estimate.data.arrivalDate
                        )
                      : `${estimate.data.dayRange.min}–${estimate.data.dayRange.max} dagar`}
                  </strong>
                </p>

                <p>
                  Beräkningen utgår från planerad överlämning
                  till PostNord{" "}
                  {formatDeliveryDate(
                    estimate.data.handoverTime
                  )}{" "}
                  kl. {estimate.data.handoverTime.slice(11, 16)}.
                </p>

                {shippingMethod === "service_point" && (
                  <p>
                    Uppskattningen gäller postnumrets standardrutt
                    och kan påverkas av valt ombud.
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {courses.length > 0 && (
          <section>
            <h2>Deltagare</h2>
            <p>
              Varje deltagare på samma utbildning
              måste ha en unik e-postadress.
            </p>

            {courses.map((item) => (
              <fieldset
                key={item.id}
                disabled={isSubmitting}
              >
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
                  <p>Ort: {item.session.city}</p>
                )}

                {getParticipants(item).map(
                  (participant, index) => {
                    const prefix =
                      `participant-${item.courseSessionId}-${index}`;

                    return (
                      <div
                        key={prefix}
                        className="participant-fields"
                      >
                        <h3>Deltagare {index + 1}</h3>

                        <label>
                          <input
                            type="checkbox"
                            checked={participant.sameAsInvoice}
                            onChange={(event) =>
                              updateParticipant(
                                item,
                                index,
                                "sameAsInvoice",
                                event.target.checked
                              )
                            }
                          />
                          Samma e-postadress som beställaren
                        </label>

                        <label htmlFor={`${prefix}-email`}>
                          Deltagarens e-postadress *
                        </label>

                        <input
                          id={`${prefix}-email`}
                          type="email"
                          required
                          value={
                            participant.sameAsInvoice
                              ? billingRecipient.email
                              : participant.email
                          }
                          readOnly={participant.sameAsInvoice}
                          onChange={(event) =>
                            updateParticipant(
                              item,
                              index,
                              "email",
                              event.target.value
                            )
                          }
                        />

                        <label htmlFor={`${prefix}-first-name`}>
                          Förnamn
                        </label>

                        <input
                          id={`${prefix}-first-name`}
                          name={`${prefix}-first-name`}
                          type="text"
                          autoComplete={
                            `section-${prefix} given-name`
                          }
                          value={participant.first_name}
                          onChange={(event) =>
                            updateParticipant(
                              item,
                              index,
                              "first_name",
                              event.target.value
                            )
                          }
                        />

                        <label htmlFor={`${prefix}-last-name`}>
                          Efternamn
                        </label>

                        <input
                          id={`${prefix}-last-name`}
                          name={`${prefix}-last-name`}
                          type="text"
                          autoComplete={
                            `section-${prefix} family-name`
                          }
                          value={participant.last_name}
                          onChange={(event) =>
                            updateParticipant(
                              item,
                              index,
                              "last_name",
                              event.target.value
                            )
                          }
                        />
                      </div>
                    );
                  }
                )}
              </fieldset>
            ))}
          </section>
        )}

        <section>
          <h2>Sammanställning</h2>

          <ul>
            {cartItems.map((item) => (
              <li key={item.id}>
                {item.title} × {item.quantity}
              </li>
            ))}
          </ul>

          <p>
            Valutaomräknade priser är ungefärliga.
            Betalning sker i SEK.
          </p>

          {quote.loading && (
            <p role="status">Hämtar aktuella priser…</p>
          )}

          {quote.error && (
            <>
              <p role="alert">{quote.error}</p>
              <button
                type="button"
                onClick={quote.reload}
                disabled={isSubmitting}
              >
                Försök hämta priser igen
              </button>
            </>
          )}

          {quote.data && shippingOption && (
            <>
              <p>
                Produkter:{" "}
                {formatPrice(
                  quote.data.itemsSubtotalOre / 100
                )}
              </p>

              {hasBooks && (
                <p>
                  Frakt:{" "}
                  {shippingOption.priceOre === 0
                    ? "Fri frakt"
                    : formatPrice(
                        shippingOption.priceOre / 100
                      )}
                </p>
              )}

              <p>
                Totalt:{" "}
                <strong>
                  {formatPrice(
                    shippingOption.totalOre / 100
                  )}
                </strong>
              </p>
            </>
          )}

          {error && <p role="alert">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
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