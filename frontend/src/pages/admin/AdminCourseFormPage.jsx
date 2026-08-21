import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  createCourse,
  fetchProductById,
  updateCourse,
} from "../../api/api.js";

import Loader from "../../components/Loader.jsx";

const emptyCourse = {
  title: "",
  slug: "",
  price: "",
  sale_price: "",
  is_on_sale: false,
  short_description: "",
  description: "",
  image_url: "",
  category: "",
  study_pace: "",
  learning_format: "onsite",
  is_published: false,
};

function createSlug(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminCourseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditing = Boolean(id);

  const [course, setCourse] =
    useState(emptyCourse);

  const [isLoading, setIsLoading] =
    useState(isEditing);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const loadCourse = async () => {
      try {
        const data = await fetchProductById(id);

        setCourse({
          title: data.title || "",
          slug: data.slug || "",
          price: data.price || "",
          sale_price: data.sale_price || "",
          is_on_sale: Boolean(data.is_on_sale),
          short_description:
            data.short_description || "",
          description: data.description || "",
          image_url: data.image_url || "",
          category: data.category || "",
          study_pace: data.study_pace || "",
          learning_format:
            data.learning_format || "onsite",
          is_published: Boolean(
            data.is_published
          ),
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCourse();
  }, [id, isEditing]);

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setCourse((current) => ({
      ...current,
      [name]:
        type === "checkbox" ? checked : value,
    }));
  };

  const handleTitleChange = (event) => {
    const title = event.target.value;

    setCourse((current) => ({
      ...current,
      title,
      slug: isEditing
        ? current.slug
        : createSlug(title),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsSaving(true);
    setError("");

    const courseData = {
      ...course,
      price: Number(course.price),

      sale_price:
        course.is_on_sale && course.sale_price
          ? Number(course.sale_price)
          : null,
    };

    try {
      if (isEditing) {
        await updateCourse(id, courseData);
      } else {
        await createCourse(courseData);
      }

      navigate("/admin/courses");
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Loader message="Laddar utbildningen..." />
    );
  }

  return (
    <section>
      <header>
        <h1>
          {isEditing
            ? "Redigera utbildning"
            : "Skapa utbildning"}
        </h1>

        <Link to="/admin/courses">
          Tillbaka
        </Link>
      </header>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="course-title">
          Titel *
        </label>

        <input
          id="course-title"
          type="text"
          name="title"
          value={course.title}
          onChange={handleTitleChange}
          required
        />

        <label htmlFor="course-slug">
          Slug *
        </label>

        <input
          id="course-slug"
          type="text"
          name="slug"
          value={course.slug}
          onChange={handleChange}
          required
        />

        <small>
          Används som ett webbvänligt unikt namn.
        </small>

        <label htmlFor="course-category">
          Kategori
        </label>

        <input
          id="course-category"
          type="text"
          name="category"
          value={course.category}
          onChange={handleChange}
        />

        <label htmlFor="short-description">
          Kort beskrivning
        </label>

        <textarea
          id="short-description"
          name="short_description"
          value={course.short_description}
          onChange={handleChange}
          maxLength="300"
          rows="3"
        />

        <label htmlFor="description">
          Längre beskrivning
        </label>

        <textarea
          id="description"
          name="description"
          value={course.description}
          onChange={handleChange}
          rows="8"
        />

        <label htmlFor="course-price">
          Ordinarie pris *
        </label>

        <input
          id="course-price"
          type="number"
          name="price"
          value={course.price}
          onChange={handleChange}
          min="0"
          step="0.01"
          required
        />

        <label>
          <input
            type="checkbox"
            name="is_on_sale"
            checked={course.is_on_sale}
            onChange={handleChange}
          />

          Utbildningen är rabatterad
        </label>

        {course.is_on_sale && (
          <>
            <label htmlFor="sale-price">
              Kampanjpris *
            </label>

            <input
              id="sale-price"
              type="number"
              name="sale_price"
              value={course.sale_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
            />
          </>
        )}

        <label htmlFor="image-url">
          Bildadress
        </label>

        <input
          id="image-url"
          type="text"
          name="image_url"
          value={course.image_url}
          onChange={handleChange}
          placeholder="/img/testbild.png"
        />

        <label htmlFor="study-pace">
          Studietakt
        </label>

        <input
          id="study-pace"
          type="text"
          name="study_pace"
          value={course.study_pace}
          onChange={handleChange}
        />

        <label htmlFor="learning-format">
          Studieform *
        </label>

        <select
          id="learning-format"
          name="learning_format"
          value={course.learning_format}
          onChange={handleChange}
          required
        >
          <option value="onsite">
            På plats
          </option>

          <option value="online">
            Online
          </option>

          <option value="hybrid">
            Hybrid
          </option>
        </select>

        <label>
          <input
            type="checkbox"
            name="is_published"
            checked={course.is_published}
            onChange={handleChange}
          />

          Publicerad
        </label>

        <button
          type="submit"
          disabled={isSaving}
        >
          {isSaving
            ? "Sparar..."
            : "Spara utbildning"}
        </button>
      </form>
    </section>
  );
}

export default AdminCourseFormPage;