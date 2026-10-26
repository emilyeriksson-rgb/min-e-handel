import { useEffect, useState } from "react";
import {
  createCourse,
  createCourseSession,
  fetchLocations,
  fetchProducts,
  fetchCourseSessions,
  updateCourse,
} from "../../api/api.js";
import Loader from "../../components/Loader.jsx";

const emptySessionForm = {
  session_type: "scheduled",
  location_type: "onsite",
  location_id: "",
  start_date: "",
  end_date: "",
  available_seats: "",
  duration: "",
};

const emptyCourseForm = {
  title: "",
  slug: "",
  price: "",
  is_on_sale: false,
  sale_price: "",
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
  const [sessions, setSessions] = useState([]);
const [areSessionsLoading, setAreSessionsLoading] =
  useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
const [message, setMessage] = useState("");
const [searchWarning, setSearchWarning] = useState("");
const [isSaving, setIsSaving] = useState(false);

const [sessionForm, setSessionForm] =
  useState(emptySessionForm);

const [sessionMessage, setSessionMessage] = useState("");
const [sessionSearchWarning, setSessionSearchWarning] = useState("");
const [isSessionSaving, setIsSessionSaving] =
  useState(false);

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

useEffect(() => {
  if (!selectedCourse) {
    return;
  }

  const loadSessions = async () => {
    try {
      setAreSessionsLoading(true);

      const sessionData = await fetchCourseSessions(
        selectedCourse.id
      );

      setSessions(sessionData);
    } catch (error) {
      setError(error.message);
    } finally {
      setAreSessionsLoading(false);
    }
  };

  loadSessions();
}, [selectedCourse]);

  const handleNewCourse = () => {
  setSelectedCourse(null);
  setCourseForm(emptyCourseForm);
  setMessage("");
  setSearchWarning("");
  setSessions([]);
setSessionMessage("");
setSessionSearchWarning("");
};

const handleSelectCourse = (course) => {
  setSessions([]);
setSessionMessage("");
setSessionSearchWarning("");
  setSelectedCourse(course);

  setCourseForm({
    title: course.title || "",
    slug: course.slug || "",
    price: course.price || "",
    is_on_sale: Boolean(course.is_on_sale),
    sale_price: course.sale_price || "",
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
  sale_price:
    courseForm.is_on_sale && courseForm.sale_price
      ? Number(courseForm.sale_price)
      : null,
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
  setMessage("Kursen har sparats.");
  setSearchWarning(savedCourse.searchIndexWarning ?? "");
  } catch (error) {
    setError(error.message);
  } finally {
    setIsSaving(false);
  }
};

const handleSessionChange = (event) => {
  const { name, value } = event.target;

  setSessionForm((currentForm) => ({
    ...currentForm,
    [name]: value,
  }));
};

const handleSessionSubmit = async (event) => {
  event.preventDefault();

  try {
    setIsSessionSaving(true);
    setSessionMessage("");
setSessionSearchWarning("");
    setError("");

    const isSelfPaced =
      sessionForm.session_type === "self_paced";

    const hasScheduledDate =
      sessionForm.session_type === "scheduled";

    const sessionData = {
      start_date: hasScheduledDate
        ? sessionForm.start_date
        : null,

      end_date:
        hasScheduledDate && sessionForm.end_date
          ? sessionForm.end_date
          : null,

      available_seats:
        sessionForm.available_seats === ""
          ? null
          : Number(sessionForm.available_seats),

      location_type: isSelfPaced
        ? "online"
        : sessionForm.location_type,

      location_id:
        !isSelfPaced &&
        sessionForm.location_type === "onsite"
          ? Number(sessionForm.location_id)
          : null,

      duration: sessionForm.duration || null,
      is_self_paced: isSelfPaced,
    };

    const createdSession = await createCourseSession(
      selectedCourse.id,
      sessionData
    );

    setSessions((currentSessions) => [
      ...currentSessions,
      createdSession,
    ]);

    setSessionForm(emptySessionForm);
    setSessionMessage("The course session has been created.");
    setSessionSearchWarning(createdSession.searchIndexWarning
      ? "The session was saved, but the search index could not be updated. Save the course again to retry."
      : "");
  } catch (error) {
    setError(error.message);
  } finally {
    setIsSessionSaving(false);
  }
};

  if (isLoading) {
    return <Loader message="Loading courses.." />;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <section className="admin-courses">
      <header>
        <h1>Manage Courses</h1>

        <button
          type="button"
          className="btn-style"
          
     onClick={handleNewCourse}
        >
          Create new
        </button>
      </header>

      <div className="admin-courses-content">
        <aside className="course-list">
          <h2>Courses</h2>

          {courses.length === 0 ? (
            <p>There is no courses</p>
          ) : (
            <ul>
              {courses.map((course) => (
                <li key={course.id}>
      <button
        type="button"
        className="course-list-button"
        aria-pressed={selectedCourse?.id === course.id}
onClick={() => handleSelectCourse(course)} >
        <span>{course.title}</span>

        <small>
          {course.is_published ? "Published" : "Draft"}
        </small>
      </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

<div className="edit-course">
  <h2>
    {selectedCourse
      ? `Redigera ${selectedCourse.title}`
      : "Skapa ny utbildning"}
  </h2>

  <p>
    {locations.length} platser har hämtats från databasen.
  </p>

<form onSubmit={handleCourseSubmit}>
  <label htmlFor="title">Title</label>
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

  <label htmlFor="price">Price</label>
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

              <label>
  <input
    name="is_on_sale"
    type="checkbox"
    checked={courseForm.is_on_sale}
    onChange={handleCourseChange}
  />
  Utbildningen har rabatt
</label>

{courseForm.is_on_sale && (
  <>
    <label htmlFor="sale_price">Rabattpris</label>
    <input
      id="sale_price"
      name="sale_price"
      type="number"
      min="0"
      step="0.01"
      value={courseForm.sale_price}
      onChange={handleCourseChange}
      required
    />
  </>
)}

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
  type="text"
  placeholder="/img/truckutbildning.webp"
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

  <button type="submit"     className="btn-style"
 disabled={isSaving}>
    {isSaving ? "Sparar..." : "Spara utbildning"}
  </button>

  {message && <p role="status">{message}</p>}
  {searchWarning && <p role="alert">{searchWarning}</p>}
</form>       
{selectedCourse && (
  <section>
<h2>Kurstillfällen</h2>

{areSessionsLoading ? (
  <Loader message="Laddar kurstillfällen..." />
) : sessions.length === 0 ? (
  <p>Utbildningen har inga kurstillfällen.</p>
) : (
  <ul>
    {sessions.map((session) => (
      <li key={session.id}>
        {session.is_self_paced
          ? "Online i egen takt"
          : session.start_date
            ? new Date(
                session.start_date
              ).toLocaleDateString("sv-SE")
            : "Datum enligt överenskommelse"}

        {session.city && ` – ${session.city}`}
      </li>
    ))}
  </ul>
)}

   <h3>Skapa kurstillfälle</h3>

<form onSubmit={handleSessionSubmit}>
  <label htmlFor="session_type">Typ av tillfälle</label>
  <select
    id="session_type"
    name="session_type"
    value={sessionForm.session_type}
    onChange={handleSessionChange}
  >
    <option value="scheduled">Bestämt datum</option>
    <option value="agreement">
      Datum enligt överenskommelse
    </option>
    <option value="self_paced">
      Online i egen takt
    </option>
  </select>

  {sessionForm.session_type !== "self_paced" && (
    <>
      <label htmlFor="location_type">
        Undervisningsplats
      </label>
      <select
        id="location_type"
        name="location_type"
        value={sessionForm.location_type}
        onChange={handleSessionChange}
      >
        <option value="onsite">På plats</option>
        <option value="online">Online</option>
      </select>
    </>
  )}

  {sessionForm.session_type !== "self_paced" &&
    sessionForm.location_type === "onsite" && (
      <>
        <label htmlFor="location_id">Plats</label>
        <select
          id="location_id"
          name="location_id"
          value={sessionForm.location_id}
          onChange={handleSessionChange}
          required
        >
          <option value="">Välj plats</option>

          {locations.map((location) => (
            <option
              key={location.id}
              value={location.id}
            >
              {location.city}
              {location.address
                ? ` – ${location.address}`
                : ""}
            </option>
          ))}
        </select>
      </>
    )}

  {sessionForm.session_type === "scheduled" && (
    <>
      <label htmlFor="start_date">Startdatum</label>
      <input
        id="start_date"
        name="start_date"
        type="date"
        value={sessionForm.start_date}
        onChange={handleSessionChange}
        required
      />

      <label htmlFor="end_date">Slutdatum</label>
      <input
        id="end_date"
        name="end_date"
        type="date"
        value={sessionForm.end_date}
        onChange={handleSessionChange}
      />
    </>
  )}

  <label htmlFor="duration">Längd</label>
  <input
    id="duration"
    name="duration"
    value={sessionForm.duration}
    onChange={handleSessionChange}
    placeholder="Exempelvis 2 dagar"
  />

  <label htmlFor="available_seats">
    Antal platser
  </label>
  <input
    id="available_seats"
    name="available_seats"
    type="number"
    min="0"
    value={sessionForm.available_seats}
    onChange={handleSessionChange}
    placeholder="Lämna tomt om antalet är obegränsat"
  />

  <button type="submit"     className="btn-style"
 disabled={isSessionSaving}>
    {isSessionSaving
      ? "Skapar..."
      : "Skapa kurstillfälle"}
  </button>

  {sessionSearchWarning && <p role="alert">{sessionSearchWarning}</p>}
  {sessionMessage && (
    <p role="status">{sessionMessage}</p>
  )}
</form>
  </section>
)}

 </div>
      </div>
    </section>
  );
}

export default AdminCoursesPage;