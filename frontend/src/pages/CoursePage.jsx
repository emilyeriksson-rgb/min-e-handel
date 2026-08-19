import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchCourseSessions,
  fetchProductById,
} from "../api/api.js";
import Loader from "../components/Loader.jsx";
import useCart from "../hooks/useCart.js";


function CoursePage() {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [sessions, setSessions] = useState([]);
   const [selectedSessionId, setSelectedSessionId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setLoading(true);
        setError("");

        const [fetchedProduct, fetchedSessions] = await Promise.all([
          fetchProductById(id),
          fetchCourseSessions(id),
        ]);

        setProduct(fetchedProduct);
        setSessions(fetchedSessions);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [id]);

const handleAddToCart = () => {
    const selectedSession = sessions.find(
      (session) => String(session.id) === selectedSessionId
    );
if (!selectedSession) {
      setMessage("Vänligen välj ett kurstillfälle.");
      return;
    }
    addToCart(product, selectedSession);
    setMessage("Kursen har lagts till i varukorgen.");
  };


  if (loading) {
    return (
      <main>
        <Loader message="Kursen laddas..." />
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <p role="alert">{error}</p>
      </main>
    );
  }

  const currentPrice =
    product.is_on_sale && product.sale_price
      ? product.sale_price
      : product.price;

  const formattedPrice = Number(currentPrice).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
  });

  return (
    <main>
      <section className="course-information">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.title}
          />
        )}

        <h1>{product.title}</h1>
        <p>{product.description}</p>

        <dl>
          <dt>Kategori</dt>
          <dd>{product.category}</dd>

          <dt>Studietakt</dt>
          <dd>{product.study_pace}</dd>

          <dt>Studieform</dt>
          <dd>{product.learning_format}</dd>
        </dl>

        <strong>{formattedPrice}</strong>
      </section>

      <section className="course-sessions">
  <h2>Välj kurstillfälle</h2>

  {sessions.length === 0 ? (
    <p>Det finns inga tillgängliga kurstillfällen.</p>
  ) : (
    sessions.map((session) => {
      const isFullyBooked = session.available_seats === 0;

      return (
        <article key={session.id}>
          <input
            type="radio"
            id={`session-${session.id}`}
            name="course-session"
            value={session.id}
            checked={
              selectedSessionId === String(session.id)
            }
            disabled={isFullyBooked}
            onChange={(event) => {
              setSelectedSessionId(event.target.value);
              setMessage("");
            }}
          />

          <label htmlFor={`session-${session.id}`}>
            Välj detta kurstillfälle
          </label>

          {session.is_self_paced ? (
            <>
              <h3>Online i egen takt</h3>
              <p>Starta när du vill.</p>
            </>
          ) : (
            <>
              <h3>
                {session.location_type === "online"
                  ? "Online"
                  : session.city || "På plats"}
              </h3>

              <p>
  Datum:{" "}
  {new Date(session.start_date).toLocaleDateString("sv-SE")}
</p>

{session.end_date && (
  <p>
    Slutdatum:{" "}
    {new Date(session.end_date).toLocaleDateString("sv-SE")}
  </p>
)}
            </>
          )}

          {session.duration && (
            <p>Längd: {session.duration}</p>
          )}

          {isFullyBooked ? (
            <p>Fullbokad</p>
          ) : (
            session.available_seats !== null && (
              <p>
                Lediga platser: {session.available_seats}
              </p>
            )
          )}
        </article>
      );
    })
  )}
</section>

    </main>
    );
}
export default CoursePage;