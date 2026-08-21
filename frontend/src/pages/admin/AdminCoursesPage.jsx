import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "../../api/api.js";
import Loader from "../../components/Loader.jsx";

function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await fetchProducts();
        setCourses(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCourses();
  }, []);

  const formatPrice = (price) =>
    Number(price).toLocaleString("sv-SE", {
      style: "currency",
      currency: "SEK",
    });

  if (isLoading) {
    return <Loader message="Laddar utbildningar..." />;
  }

  return (
    <section>
      <header>
        <h1>Utbildningar</h1>

        <Link to="/admin/courses/new">
          Skapa utbildning
        </Link>
      </header>

      {error && <p role="alert">{error}</p>}

      {!error && courses.length === 0 && (
        <p>Det finns inga utbildningar.</p>
      )}

      {!error && courses.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Utbildning</th>
              <th>Kategori</th>
              <th>Pris</th>
              <th>Status</th>
              <th>Åtgärd</th>
            </tr>
          </thead>

          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>{course.title}</td>
                <td>{course.category}</td>
                <td>{formatPrice(course.price)}</td>

                <td>
                  {course.is_published
                    ? "Publicerad"
                    : "Utkast"}
                </td>

                <td>
                  <Link
                    to={`/admin/courses/${course.id}/edit`}
                  >
                    Redigera
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AdminCoursesPage;