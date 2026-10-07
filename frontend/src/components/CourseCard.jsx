import { Link } from "react-router-dom";
import useCurrency from "../hooks/useCurrency.js";

function CourseCard({ product }) {
    const { currency, rates } = useCurrency();
    const currentPrice =
    product.is_on_sale && product.sale_price
        ? product.sale_price
        : product.price;

 const rate = rates[currency];

const formattedPrice = rate === undefined
  ? "Valutakurs saknas"
  : (Number(currentPrice) * rate).toLocaleString("sv-SE", {
      style: "currency",
      currency,
    });

return (
    <Link to={`/courses/${product.id}`} className="course-card-link" aria-label={`Läs mer om ${product.title}`}>
        <article className="course-card">
            <p className="category">{product.category}</p>
            {product.image_url && (<img src={product.image_url} alt={product.title}/>)}
            <h2 className="title">{product.title}</h2>
            <p className="description">{product.short_description || product.description}</p>
            <strong>{formattedPrice}</strong>
            <p className="study-info">{product.study_pace} | {product.learning_format}</p>
        </article>
    </Link>
);
}
export default CourseCard;
