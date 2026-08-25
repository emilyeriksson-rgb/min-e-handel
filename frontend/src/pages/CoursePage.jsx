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
      <main className="site-main">
        <Loader message="Kursen laddas..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="site-main">
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

const firstSession = sessions[0];


  return (
    <main className="site-main">
      <section className="course-information">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.title}
          />
        )}

        <h1>{product.title}</h1>
        <strong> {product.short_description}</strong>
        <p>{product.description}</p>

        <dl className="course-details">
          <dt>Kategori</dt>
          <dd>{product.category}</dd>

          <dt>Studietakt</dt>
          <dd>{product.study_pace}</dd>

          <dt>Studieform</dt>
          <dd>{product.learning_format}</dd>
    {firstSession?.city && (
      <>
        <dt>Ort</dt>
        <dd>{firstSession.city}</dd>
      </>
    )}

    {firstSession?.duration && (
      <>
        <dt>Utbildningens längd</dt>
        <dd>{firstSession.duration}</dd>
      </>
    )}

        </dl>

        <strong>{formattedPrice}</strong>
      </section>

      <section className="course-sessions">
  <h2>Välj kurstillfälle</h2>

  {sessions.length === 0 ? (
    <p>Det finns inga tillgängliga kurstillfällen.</p>
  ) : (
 
<>
  <label htmlFor="course-session">
    Tillgängliga datum
  </label>

  <select
    id="course-session"
    value={selectedSessionId}
    onChange={(event) => {
      setSelectedSessionId(event.target.value);
      setMessage("");
    }}
  >
    <option value="">Välj ett datum</option>

    {sessions.map((session) => {
      const isFullyBooked =
        session.available_seats === 0;

     let dateText;

if (session.is_self_paced) {
  dateText = "Online i egen takt – starta när du vill";
} else if (!session.start_date) {
  dateText = "Datum enligt överenskommelse";
} else {
  dateText = new Date(
    session.start_date
  ).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

      return (
        <option
          key={session.id}
          value={session.id}
          disabled={isFullyBooked}
        >
          {dateText}
          {isFullyBooked ? " – Fullbokad" : ""}
        </option>
      );
    })}
  </select>
</>

  )}
<button
  type="button"
  onClick={handleAddToCart}
  disabled={!selectedSessionId}
>
  Lägg till i varukorgen
</button>

{message && (
  <p role="status">
    {message}
  </p>
)}

</section>

    </main>
    );
}
export default CoursePage;