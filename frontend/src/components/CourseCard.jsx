import { Link } from "react-router-dom";

function CourseCard({ product }) {
    const currentPrice =
    product.is_on_sale && product.sale_price
        ? product.sale_price
        : product.price;

        const formattedPrice = Number(currentPrice).toLocaleString("sv-SE", {
            style: "currency",
            currency: "SEK",
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
