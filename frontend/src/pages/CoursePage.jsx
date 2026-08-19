import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchCourseSessions,
  fetchProductById,
} from "../api/api.js";
import Loader from "../components/Loader.jsx";

function CoursePage() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [sessions, setSessions] = useState([]);
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
        <h2> {sessions.length === 0 ? "Välj kurstillfälle" : "Det finns ett kurstillfälle tillgängligt"}</h2>

        {sessions.length === 0 ? (
          <p>Det finns inga tillgängliga kurstillfällen.</p>
        ) : (
          sessions.map((session) => (
            <article key={session.id}>
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
                    Utbildningen pågår{" "}
                    {new Date(session.start_date).toLocaleDateString(
                      "sv-SE"
                    )}
                 {" "} - {" "}
                    {new Date(session.end_date).toLocaleDateString(
                      "sv-SE"
                    )}
                  </p>
                </>
              )}

              {session.duration && (
                <p>Längd: {session.duration}</p>
              )}

              {session.available_seats !== null && (
                <p>Lediga platser: {session.available_seats}</p>
              )}
            </article>
          ))
        )}
      </section>

      <section className="group-booking-info">
        <h2>Gruppbokning</h2>

        <p>
          För gruppbokning, kontakta oss på{" "}
          <a href="mailto:info@skolan.se">
            info@skolan.se
          </a>
        </p>
      </section>

      <section className="questions-and-answers">
        <h2>Frågor och svar</h2>

        <p>
          Har du frågor om kursen? Kontakta oss så hjälper våra
          handledare dig.
        </p>
      </section>
    </main>
  );
}

export default CoursePage;