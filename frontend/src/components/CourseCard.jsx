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
        <article className="course-card">
            {product.image_url && (
                <img
                    src={product.image_url}
                    alt={product.title}
                />
            )}
            <p className="category">{product.category}</p>
            <h2>{product.title}</h2>
            <p className="description">{product.description}</p>
            <p className="study-info">{product.study_pace} {product.learning_format}</p>
            <strong>{formattedPrice}</strong>
        </article>
    );
}

export default CourseCard;