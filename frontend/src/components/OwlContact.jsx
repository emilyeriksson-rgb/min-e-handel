import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/OwlContact.css";

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function OwlContact({ email = "", delayMs = 5000 }) {
  const [ready, setReady] = useState(false);
  const [owlVisible, setOwlVisible] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [closing, setClosing] = useState(false);
  const [openedFromMini, setOpenedFromMini] = useState(false);
  const owlRef = useRef(null);
  const miniRef = useRef(null);
  const closeRef = useRef(null);
  const closeTimer = useRef(null);
  const restoreFocus = useRef(false);
  const panelId = useId();
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const mailHref = hasEmail
    ? `mailto:${email.trim()}?subject=${encodeURIComponent("Fråga om utbildning på Kursrum")}`
    : undefined;

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  useEffect(() => {
    const owl = owlRef.current;
    if (!owl) return;
    if (!("IntersectionObserver" in window)) {
      setOwlVisible(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setOwlVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2);
    }, { threshold: [0, 0.2] });
    observer.observe(owl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    const target = minimized ? miniRef.current : closeRef.current;
    target?.focus({ preventScroll: true });
  }, [minimized]);

  function minimize() {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      restoreFocus.current = true;
      setMinimized(true);
      setClosing(false);
    }, 160);
  }

  function reopen() {
    restoreFocus.current = true;
    setMinimized(false);
  }

  // Om användaren öppnar från den fasta knappen stannar panelen också där
  // så att tangentbordsfokus aldrig flyttas upp utanför skärmen.
  const floating = !owlVisible || openedFromMini;

  return (
    <div className="owl-contact">
      <img ref={owlRef} className={`homepage-hero__image owl-contact__image${ready && !minimized ? " is-greeting" : ""}`}
        src="/img/kursrum-uggla.webp" alt="" width="1254" height="1254" />

      {ready && !minimized && (
        <div id={panelId}
          className={`owl-contact__bubble ${floating ? "is-floating" : "is-anchored"}${closing ? " is-closing" : ""}`}
          role="region" aria-label="Kontakta Kursrum"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              minimize();
            }
          }}>
          <button ref={closeRef} className="owl-contact__close" type="button"
            onClick={minimize} aria-label="Minimera kontaktbubblan">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          <p>Hittar du inte vad du söker, maila våran människa.</p>
          {hasEmail ? (
            <a className="owl-contact__mail" href={mailHref}><MailIcon />Maila</a>
          ) : (
            <button className="owl-contact__mail" type="button" disabled><MailIcon />Maila</button>
          )}
        </div>
      )}

      {ready && minimized && createPortal(
        <button ref={miniRef} className="owl-contact__mini" type="button"
          aria-label="Öppna kontaktbubblan" aria-expanded="false" aria-controls={panelId}
          onClick={() => { setOpenedFromMini(true); reopen(); }}>
          <MailIcon />
        </button>, document.body,
      )}
    </div>
  );
}

export default OwlContact;
