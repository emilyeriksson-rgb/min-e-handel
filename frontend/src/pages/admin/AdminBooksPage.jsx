import { useState } from "react";
import { importBooks } from "../../api/api.js";

function AdminBooksPage() {
  const [loadingFormat, setLoadingFormat] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  async function handleImport(format) {
    setLoadingFormat(format);
    setError("");
    setReport(null);

    try {
      const result = await importBooks(format);
      setReport({
        ...result,
        format: format.toUpperCase(),
      });
    } catch (error) {
      setError(error.message || "Importen misslyckades.");
    } finally {
      setLoadingFormat("");
    }
  }

  return (
    <section className="admin-dashboard">
      <h1>Course Literature</h1>
     

      <section aria-labelledby="book-import-heading">
        <h2 id="book-import-heading">
          Import Course Literature
        </h2>
        <p>Get the latest course literature from the publisher by importing a CSV or XML file. The import will create new products, update existing ones, and skip any products that cannot be imported. After the import is complete, you will receive a report detailing the results of the import.</p>

        <div className="book-import-actions">
          <button
            type="button"
            className="manage-order-button"
            disabled={Boolean(loadingFormat)}
            onClick={() => handleImport("csv")}
          >
            Import CSV
          </button>

          <button
            type="button"
            className="manage-order-button"
            disabled={Boolean(loadingFormat)}
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
              Importrapport – {report.format}
            </h3>

            <p role="status">
              Import is done. New: {report.created}.
              Updated: {report.updated}.
              Skipped: {report.skippedCount}.
            </p>

            {report.searchIndexWarning && (
              <p role="alert">{report.searchIndexWarning}</p>
            )}

            {report.searchIndexUpdated && (
              <p role="status">Sökindexet är uppdaterat.</p>
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
    </section>
  );
}

export default AdminBooksPage;