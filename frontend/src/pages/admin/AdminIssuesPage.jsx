import { useEffect, useState } from "react";
import "../../styles/AdminIssues.css";

import {
  fetchOpenIssues,
  reportGitHubIssue,
} from "../../api/api.js";

function AdminIssuesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdIssue, setCreatedIssue] = useState(null);

  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [listing, setListing] = useState(null);

  const requestKey = `${page}:${refresh}`;
  const listReady = listing?.key === requestKey;

  useEffect(() => {
    const controller = new AbortController();

    async function loadIssues() {
      try {
        const data = await fetchOpenIssues(
          page,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setListing({
            key: requestKey,
            issues: data.issues,
            hasMore: data.hasMore,
            error: "",
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListing({
            key: requestKey,
            issues: [],
            hasMore: false,
            error:
              error.name === "TimeoutError"
                ? "The request took too long. Please try again."
                : error.message || "Could not fetch issues.",
          });
        }
      }
    }

    loadIssues();

    return () => controller.abort();
  }, [page, requestKey]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");
    setCreatedIssue(null);

    try {
      const issue = await reportGitHubIssue({
        title,
        description,
      });

      setCreatedIssue(issue);
      setTitle("");
      setDescription("");
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (error) {
      setSubmitError(
        "The report could not be confirmed. " +
        "Please check the reported issues before resubmitting. " +
        (error.name === "TimeoutError"
          ? "The request took too long."
          : error.message || "")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="admin-issues">
      <h1>Issue reports</h1>

      <section className="admin-issues-panel">
        <h2>Report an issue</h2>

        <form onSubmit={handleSubmit}>
          <p>
            <label htmlFor="issue-title">Title</label>
            <input
              id="issue-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              disabled={isSubmitting}
            />
          </p>

          <p>
            <label htmlFor="issue-description">
              Description
            </label>
            <textarea
              id="issue-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={6}
              maxLength={10000}
              required
              disabled={isSubmitting}
            />
          </p>

          {submitError && (
            <p role="alert">{submitError}</p>
          )}

          {createdIssue && (
            <p role="status">
              The issue report was created!{" "}
              <a
                href={createdIssue.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open issue #{createdIssue.number}
              </a>
            </p>
          )}

          <button
            type="submit"
            className="btn-style"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Issue Report"}
          </button>
        </form>
      </section>

      <section className="admin-issues-panel">
        <h2>Open Issues</h2>

        {!listReady && (
          <p role="status">Fetching issues...</p>
        )}

        {listReady && listing.error && (
          <p role="alert">{listing.error}</p>
        )}

        {listReady &&
          !listing.error &&
          listing.issues.length === 0 && (
            <p>No issues to display on this page.</p>
          )}

        {listReady && !listing.error && (
          <ul className="admin-issues-list">
            {listing.issues.map((issue) => (
              <li key={issue.number}>
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                    <span className="issue-number">#{issue.number}</span>
                    <span className="issue-title">{issue.title}</span>
                    <span className="issue-status">Open</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <p>Page {page}</p>

        <button
          type="button"
          className="btn-style"
          onClick={() => setPage((value) => value - 1)}
          disabled={page === 1 || !listReady}
        >
          Previous
        </button>

        <button
          type="button"
          className="btn-style"
          onClick={() => setPage((value) => value + 1)}
          disabled={
            !listReady || Boolean(listing.error) || !listing.hasMore
          }
        >
          Next
        </button>

        <button
          type="button"
          className="btn-style"
          onClick={() => setRefresh((value) => value + 1)}
          disabled={!listReady}
        >
          Update List
        </button>
      </section>
    </section>
  );
}

export default AdminIssuesPage;