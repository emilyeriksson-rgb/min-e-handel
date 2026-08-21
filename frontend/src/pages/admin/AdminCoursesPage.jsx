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
  category: "",
  study_pace: "",
  short_description: "",
  description: "",
  image_url: "",
  is_published: false,
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
     category: course.category || "",
  study_pace: course.study_pace || "",
  short_description: course.short_description || "",
  description: course.description || "",
  image_url: course.image_url || "",
  is_published: Boolean(course.is_published),
  });

  setMessage("");
};

const handleCourseChange = (event) => {
  const { name, value, type, checked } = event.target;

  setCourseForm((currentForm) => ({
    ...currentForm,
    [name]: type === "checkbox" ? checked : value,
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

  <label htmlFor="category">Kategori</label>
<input
  id="category"
  name="category"
  value={courseForm.category}
  onChange={handleCourseChange}
/>

<label htmlFor="study_pace">Studietakt</label>
<input
  id="study_pace"
  name="study_pace"
  value={courseForm.study_pace}
  onChange={handleCourseChange}
  placeholder="Exempelvis heltid eller egen takt"
/>

<label htmlFor="short_description">
  Kort beskrivning
</label>
<textarea
  id="short_description"
  name="short_description"
  value={courseForm.short_description}
  onChange={handleCourseChange}
/>

<label htmlFor="description">
  Fullständig beskrivning
</label>
<textarea
  id="description"
  name="description"
  value={courseForm.description}
  onChange={handleCourseChange}
/>

<label htmlFor="image_url">Bildadress</label>
<input
  id="image_url"
  name="image_url"
  type="url"
  value={courseForm.image_url}
  onChange={handleCourseChange}
/>

<label>
  <input
    name="is_published"
    type="checkbox"
    checked={courseForm.is_published}
    onChange={handleCourseChange}
  />
  Publicerad i webbutiken
</label>

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