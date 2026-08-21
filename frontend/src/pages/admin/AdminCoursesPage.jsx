import { useEffect, useState } from "react";
import {
  createCourse,
  fetchLocations,
  fetchProducts,
  updateCourse,
} from "../../api/api.js";
import Loader from "../../components/Loader.jsx";

const emptyCourseForm = {
  title: "",
  slug: "",
  price: "",
  learning_format: "",
};

function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
const [message, setMessage] = useState("");
const [isSaving, setIsSaving] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const [courseData, locationData] = await Promise.all([
          fetchProducts(),
          fetchLocations(),
        ]);

        setCourses(courseData);
        setLocations(locationData);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const handleNewCourse = () => {
  setSelectedCourse(null);
  setCourseForm(emptyCourseForm);
  setMessage("");
};

const handleSelectCourse = (course) => {
  setSelectedCourse(course);

  setCourseForm({
    title: course.title || "",
    slug: course.slug || "",
    price: course.price || "",
    learning_format: course.learning_format || "",
  });

  setMessage("");
};

const handleCourseChange = (event) => {
  const { name, value } = event.target;

  setCourseForm((currentForm) => ({
    ...currentForm,
    [name]: value,
  }));
};

const handleCourseSubmit = async (event) => {
  event.preventDefault();

  try {
    setIsSaving(true);
    setError("");
    setMessage("");

    const courseData = {
      ...courseForm,
      price: Number(courseForm.price),
    };

    let savedCourse;

    if (selectedCourse) {
      savedCourse = await updateCourse(
        selectedCourse.id,
        courseData
      );

      setCourses((currentCourses) =>
        currentCourses.map((course) =>
          course.id === savedCourse.id
            ? savedCourse
            : course
        )
      );
    } else {
      savedCourse = await createCourse(courseData);

      setCourses((currentCourses) => [
        savedCourse,
        ...currentCourses,
      ]);
    }

    setSelectedCourse(savedCourse);
    setMessage("Utbildningen har sparats.");
  } catch (error) {
    setError(error.message);
  } finally {
    setIsSaving(false);
  }
};

  if (isLoading) {
    return <Loader message="Laddar utbildningar..." />;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <section className="admin-courses">
      <header>
        <h1>Hantera utbildningar</h1>

        <button
          type="button"
     onClick={handleNewCourse}
        >
          Skapa ny utbildning
        </button>
      </header>

      <div className="admin-courses-content">
        <aside>
          <h2>Utbildningar</h2>

          {courses.length === 0 ? (
            <p>Det finns inga utbildningar.</p>
          ) : (
            <ul>
              {courses.map((course) => (
                <li key={course.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectCourse(course)}
                  >
                    {course.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div>
          <h2>
            {selectedCourse
              ? `Redigera ${selectedCourse.title}`
              : "Skapa ny utbildning"}
          </h2>

          <p>
            {locations.length} platser har hämtats från databasen.
          </p>

<form onSubmit={handleCourseSubmit}>
  <label htmlFor="title">Titel</label>
  <input
    id="title"
    name="title"
    value={courseForm.title}
    onChange={handleCourseChange}
    required
  />

  <label htmlFor="slug">Slug</label>
  <input
    id="slug"
    name="slug"
    value={courseForm.slug}
    onChange={handleCourseChange}
    required
  />

  <label htmlFor="price">Grundpris</label>
  <input
    id="price"
    name="price"
    type="number"
    min="0"
    step="0.01"
    value={courseForm.price}
    onChange={handleCourseChange}
    required
  />

  <label htmlFor="learning_format">
    Undervisningsformat
  </label>
  <select
    id="learning_format"
    name="learning_format"
    value={courseForm.learning_format}
    onChange={handleCourseChange}
    required
  >
    <option value="">Välj format</option>
    <option value="onsite">På plats</option>
    <option value="online">Online</option>
  </select>

  <button type="submit" disabled={isSaving}>
    {isSaving ? "Sparar..." : "Spara utbildning"}
  </button>

  {message && <p role="status">{message}</p>}
</form>        </div>
      </div>
    </section>
  );
}

export default AdminCoursesPage;