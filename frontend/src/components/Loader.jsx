import "../styles/Loader.css";

function Loader({ message = "Laddar…" }) {
  return (
    <div className="kursrum-loader" role="status" aria-live="polite">
      <picture className="kursrum-loader__picture" aria-hidden="true">
        <source
          media="(prefers-reduced-motion: reduce)"
          srcSet="/img/kursrum-loader-still.webp"
        />
        <img
          src="/img/kursrum-loader.webp"
          alt=""
          width="192"
          height="192"
        />
      </picture>
      <p className="kursrum-loader__message">{message}</p>
    </div>
  );
}

export default Loader;
