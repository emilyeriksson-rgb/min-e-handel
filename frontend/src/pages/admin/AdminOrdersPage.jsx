import { useEffect, useState } from "react";
import Loader from "../../components/Loader.jsx";
import { fetchOrderById, fetchOrders,} from "../../api/api.js";

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
const [isOrderLoading, setIsOrderLoading] =
  useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const orderData = await fetchOrders();
        setOrders(orderData);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, []);

  const formatPrice = (price) =>
    Number(price).toLocaleString("sv-SE", {
      style: "currency",
      currency: "SEK",
    });

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("sv-SE");

  const handleSelectOrder = async (orderId) => {
  try {
    setIsOrderLoading(true);
    setError("");

    const orderData = await fetchOrderById(orderId);
    setSelectedOrder(orderData);
  } catch (error) {
    setError(error.message);
  } finally {
    setIsOrderLoading(false);
  }
};

  if (isLoading) {
    return <Loader message="Laddar ordrar..." />;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <section>
      <h1>Ordrar</h1>

      {orders.length === 0 ? (
        <p>Det finns inga ordrar.</p>
      ) : (
      <table>
  <thead>
    <tr>
      <th>Order</th>
      <th>Fakturamottagare</th>
      <th>E-post</th>
      <th>Datum</th>
      <th>Status</th>
      <th>Summa</th>
      <th>Visa</th>
    </tr>
  </thead>

  <tbody>
    {orders.map((order) => (
      <tr key={order.id}>
        <td>#{order.id}</td>

        <td>
          {order.company_name ||
            order.invoice_name ||
            "Saknas"}
        </td>

        <td>{order.invoice_email}</td>
        <td>{formatDate(order.created_at)}</td>
        <td>{order.payment_status}</td>
        <td>{formatPrice(order.total_amount)}</td>

        <td>
          <button
            type="button"
            onClick={() => handleSelectOrder(order.id)}
          >
            Visa order
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
      )}

      {isOrderLoading && (
  <Loader message="Laddar orderdetaljer..." />
)}

{selectedOrder && !isOrderLoading && (
  <section>
    <h2>Order #{selectedOrder.id}</h2>

    <h3>Fakturauppgifter</h3>

    <p>
      Namn:{" "}
      {selectedOrder.invoice_name ||
        selectedOrder.company_name}
    </p>

    <p>E-post: {selectedOrder.invoice_email}</p>

    {selectedOrder.organization_number && (
      <p>
        Organisationsnummer:{" "}
        {selectedOrder.organization_number}
      </p>
    )}

    <p>
      Adress: {selectedOrder.address},{" "}
      {selectedOrder.postal_code} {selectedOrder.city}
    </p>

    <h3>Beställda utbildningar</h3>

    {selectedOrder.items.map((item) => (
      <article key={item.id}>
        <h4>{item.course_title}</h4>

        <p>
          Pris: {formatPrice(item.price_at_purchase)}
        </p>

        <p>Antal deltagare: {item.quantity}</p>

        {item.start_date ? (
          <p>
            Kursdatum: {formatDate(item.start_date)}
          </p>
        ) : (
          <p>Datum enligt överenskommelse</p>
        )}

        {item.city && (
          <p>
            Plats: {item.city}
            {item.address && `, ${item.address}`}
          </p>
        )}

        <h5>Deltagare</h5>

        {item.participants.map((participant) => (
          <p key={participant.id}>
            {participant.first_name}{" "}
            {participant.last_name} –{" "}
            {participant.email}
          </p>
        ))}
      </article>
    ))}

    <p>
      Totalt:{" "}
      <strong>
        {formatPrice(selectedOrder.total_amount)}
      </strong>
    </p>
  </section>
)}
    </section>
  );
}

export default AdminOrdersPage;