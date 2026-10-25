import { useEffect, useState } from "react";
import { importBooks, fetchBooks, updateBook, deleteBook } from "../../api/api.js";

import BookEditDialog from "../../components/admin/BookEditDialog.jsx";

function AdminBooksPage() {
  const [loadingFormat, setLoadingFormat] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState("");

  const [selectedBook, setSelectedBook] = useState(null);
  const [bookForm, setBookForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [searchWarning, setSearchWarning] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadBooks() {
      try {
        const data = await fetchBooks();

        if (active) {
          setBooks(data);
        }
      } catch {
        if (active) {
          setBooksError("Could not load the books.");
        }
      } finally {
        if (active) {
          setBooksLoading(false);
        }
      }
    }

    loadBooks();

    return () => {
      active = false;
    };
  }, []);

  async function handleImport(format) {
    setLoadingFormat(format);
    setError("");
    setReport(null);
    setSelectedBook(null);
    setBookForm(null);
    setSaveMessage("");
    setSearchWarning("");
    setDeleteResult(null);

    try {
      const result = await importBooks(format);

      setReport({
        ...result,
        format: format.toUpperCase(),
      });

      setBooksError("");
      setBooksLoading(true);

      try {
        const updatedBooks = await fetchBooks();
        setBooks(updatedBooks);
      } catch {
        setBooksError(
          "Import completed, but the book list could not be refreshed. Reload the page."
        );
      } finally {
        setBooksLoading(false);
      }
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setLoadingFormat("");
    }
  }

  function handleEdit(book) {
  setDeleteResult(null);
  setSelectedBook(book);
  setBookForm({
    title: book.title,
    category: book.category,
    price: String(book.price),
    stock: String(book.stock),
    variants: book.variants.join(" | "),
  });

  setError("");
  setSaveMessage("");
  setSearchWarning("");
}

function handleBookChange(event) {
  const { name, value } = event.target;

  setBookForm((current) => ({
    ...current,
    [name]: value,
  }));
}

async function handleBookSave(event) {
  event.preventDefault();
  if (isSaving || isDeleting || loadingFormat) return;

  setIsSaving(true);
  setError("");
  setSaveMessage("");
  setSearchWarning("");

  try {
    const result = await updateBook(selectedBook.sku, {
      title: bookForm.title.trim(),
      category: bookForm.category.trim(),
      price: Number(bookForm.price),
      stock: Number(bookForm.stock),
      variants: bookForm.variants
        .split("|")
        .map((variant) => variant.trim())
        .filter(Boolean),
    });

    setBooks((current) =>
      current
        .map((book) =>
          book.sku === result.book.sku ? result.book : book
        )
        .sort((a, b) => a.title.localeCompare(b.title, "en"))
    );

    setSelectedBook(result.book);
    setSaveMessage("Book saved.");

    if (result.searchIndexWarning) {
      setSearchWarning(
        "The book was saved, but the search index could not be updated. Save again to retry."
      );
    }
  } catch {
    setError(
      "Could not save the book. Check the entered values and try again."
    );
  } finally {
    setIsSaving(false);
  }
}

  async function handleBookDelete() {
    if (!selectedBook || isSaving || isDeleting || loadingFormat) return;
    const book = selectedBook;
    if (!window.confirm(`Delete "${book.title}" (${book.sku})?`)) return;

    setIsDeleting(true);
    setError("");
    setDeleteResult(null);
    try {
      const result = await deleteBook(book.sku);
      setBooks((current) => current.filter((item) => item.sku !== book.sku));
      setSelectedBook(null);
      setBookForm(null);
      setSaveMessage("");
      setSearchWarning("");
      setDeleteResult({ warning: Boolean(result.searchIndexWarning) });
    } catch {
      setError("Could not delete the book. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  function closeEditor() {
    if (isSaving || isDeleting) return;
    setSelectedBook(null);
    setBookForm(null);
  }

  return (
    <section className="admin-dashboard">
      <h1>Course Literature</h1>

      <section aria-labelledby="book-import-heading">
        <h2 id="book-import-heading">
          Import Course Literature
        </h2>

        <p>
          Get the latest course literature from the publisher by
          importing a CSV or XML file. The import will create new
          products, update existing ones, and skip any products that
          cannot be imported. After the import is complete, you will
          receive a report detailing the results.
        </p>

        <div className="book-import-actions">
          <button
            type="button"
            className="manage-order-button"
            disabled={Boolean(loadingFormat) || booksLoading || isSaving || isDeleting}
            onClick={() => handleImport("csv")}
          >
            Import CSV
          </button>

          <button
            type="button"
            className="manage-order-button"
            disabled={Boolean(loadingFormat) || booksLoading || isSaving || isDeleting}
            onClick={() => handleImport("xml")}
          >
            Import XML
          </button>
        </div>

        {loadingFormat && (
          <p role="status">
            Importing {loadingFormat.toUpperCase()}…
          </p>
        )}

        {error && <p role="alert">{error}</p>}

        {report && (
          <section aria-labelledby="import-report-heading">
            <h3 id="import-report-heading">
              Import Report – {report.format}
            </h3>

            <p role="status">
              Import completed. New: {report.created}.
              Updated: {report.updated}.
              Skipped: {report.skippedCount}.
            </p>

            {report.searchIndexWarning && (
              <p role="alert">
                Books were saved to the database, but the search
                index could not be updated. Please import again
                to retry.
              </p>
            )}

            {report.searchIndexUpdated && (
              <p role="status">Search index updated.</p>
            )}

            {report.skipped.length > 0 && (
              <>
                <h4>Skipped Products</h4>

                <ul>
                  {report.skipped.map((item, index) => (
                    <li key={`${item.sku}-${index}`}>
                      <strong>{item.sku}</strong>: {item.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </section>

      <section aria-labelledby="stored-books-heading">
        <h2 id="stored-books-heading">
          Course Literature in the Database
        </h2>

        {booksLoading && (
          <p role="status">Loading books…</p>
        )}

        {booksError && (
          <p role="alert">{booksError}</p>
        )}

        {!booksLoading && !booksError && books.length === 0 && (
          <p>No books found. Import a CSV or XML file first.</p>
        )}

        {!booksLoading && books.length > 0 && (
          <ul>
            {books.map((book) => (
              <li key={book.sku}>
                <strong>{book.title}</strong>

                <p>
                  {book.sku} · {book.category}
                </p>

                <p>
                  {book.price.toLocaleString("en-GB", {
                    style: "currency",
                    currency: "SEK",
                  })}
                  {" · "}
                  In stock: {book.stock}
                </p>

                <button
                  type="button"
                  className="manage-order-button"
                  disabled={isSaving || isDeleting || Boolean(loadingFormat)}
                  onClick={() => handleEdit(book)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
        {deleteResult && (
          <div>
            <p role="status">Book deleted from the database.</p>
            {deleteResult.warning && (
              <p role="alert">
                The search index could not be updated. The book may still appear
                in search results. Contact the administrator to retry indexing.
              </p>
            )}
          </div>
        )}

        <BookEditDialog
          open={Boolean(selectedBook && bookForm)}
          busy={isSaving || isDeleting}
          onClose={closeEditor}
        >
{selectedBook && bookForm && (
  <form onSubmit={handleBookSave}>
    <h3 id="book-edit-heading">Edit Course Literature</h3>
    {error && <p role="alert">{error}</p>}
    {saveMessage && <p role="status">{saveMessage}</p>}
    {searchWarning && <p role="alert">{searchWarning}</p>}
    <p>Article number: {selectedBook.sku}</p>

    <fieldset disabled={isSaving || isDeleting || Boolean(loadingFormat)}>
      <legend>Book details</legend>

      <label htmlFor="book-title">Title</label>
      <input
        id="book-title"
        name="title"
        value={bookForm.title}
        onChange={handleBookChange}
        maxLength={500}
        required
      />

      <label htmlFor="book-category">Category</label>
      <input
        id="book-category"
        name="category"
        value={bookForm.category}
        onChange={handleBookChange}
        maxLength={200}
        required
      />

      <label htmlFor="book-price">Price (SEK)</label>
      <input
        id="book-price"
        name="price"
        type="number"
        min="0"
        max="9999999999.99"
        step="0.01"
        value={bookForm.price}
        onChange={handleBookChange}
        required
      />

      <label htmlFor="book-stock">Stock</label>
      <input
        id="book-stock"
        name="stock"
        type="number"
        min="0"
        max="2147483647"
        step="1"
        value={bookForm.stock}
        onChange={handleBookChange}
        required
      />

      <label htmlFor="book-variants">
        Variants — separate with |
      </label>
      <input
        id="book-variants"
        name="variants"
        value={bookForm.variants}
        onChange={handleBookChange}
      />

      <button type="submit" className="manage-order-button">
        {isSaving ? "Saving…" : "Save"}
      </button>

      <button
        type="button"
        className="manage-order-button"
        onClick={closeEditor}
      >
        Close
      </button>
      <button type="button" className="manage-order-button book-delete-button"
        onClick={handleBookDelete}>
        {isDeleting ? "Deleting…" : "Delete"}
      </button>
    </fieldset>
  </form>
)}
        </BookEditDialog>
      </section>
    </section>
  );
}

export default AdminBooksPage;