import { useEffect, useState } from "react";
import Loader from "../../components/Loader.jsx";
import { fetchOrderById, fetchOrders, updateInvoiceStatus, updateOrderStatus,} from "../../api/api.js";

const orderStatusLabels = {
  new: "New",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const shippingMethodLabels = {
  none: "No shipping required",
  service_point: "Service point",
  home: "Home delivery",
};

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
const [isOrderLoading, setIsOrderLoading] =  useState(false);
const [selectedStatus, setSelectedStatus] = useState("");
const [statusMessage, setStatusMessage] = useState("");
const [selectedInvoiceStatus, setSelectedInvoiceStatus] = useState("");
const [isInvoiceStatusSaving,  setIsInvoiceStatusSaving,] = useState(false);
const [invoiceStatusMessage, setInvoiceStatusMessage] = useState("");

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
    setSelectedStatus(orderData.order_status);
    setSelectedInvoiceStatus( orderData.invoice_status || orderData.payment_status);
    setStatusMessage("");
    setInvoiceStatusMessage("");
    
  } catch (error) {
    setError(error.message);
  } finally {
    setIsOrderLoading(false);
  }
};

  if (isLoading) {
    return <Loader message="Loading..." />;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

const handleSaveInvoiceStatus = async () => {
  try {
    setIsInvoiceStatusSaving(true);
    setError("");
    setInvoiceStatusMessage("");

    const orderId = selectedOrder.id;

    const updatedPayment = await updateInvoiceStatus(
      orderId,
      selectedInvoiceStatus
    );

    setSelectedOrder((currentOrder) => ({
      ...currentOrder,
      invoice_status: updatedPayment.invoice_status,
      payment_status: updatedPayment.invoice_status,
      paid_at: updatedPayment.paid_at,
    }));

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              invoice_status:
                updatedPayment.invoice_status,
              payment_status:
                updatedPayment.invoice_status,
            }
          : order
      )
    );

    setInvoiceStatusMessage(
      "Invoice status has been saved."
    );
  } catch (error) {
    setError(error.message);
  } finally {
    setIsInvoiceStatusSaving(false);
  }
};

const handleSaveOrderStatus = async () => {
  try {
    setIsStatusSaving(true);
    setError("");
    setStatusMessage("");

    const updatedOrder = await updateOrderStatus(
      selectedOrder.id,
      selectedStatus
    );

    setSelectedOrder((currentOrder) => ({
      ...currentOrder,
      order_status: updatedOrder.order_status,
    }));

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === updatedOrder.id
          ? {
              ...order,
              order_status: updatedOrder.order_status,
            }
          : order
      )
    );

    setStatusMessage("Order status has been saved.");
  } catch (error) {
    setError(error.message);
  } finally {
    setIsStatusSaving(false);
  }
};



const handleCloseOrder = () => {
  setSelectedOrder(null);
  setSelectedStatus("");
  setSelectedInvoiceStatus("");
  setStatusMessage("");
  setInvoiceStatusMessage("");
};

  return (
    <section>
      <h1>Orders</h1>

      {orders.length === 0 ? (
        <p>There are no orders.</p>
      ) : (
      <table className="admin-table-wrapper">
  <thead>
    <tr>
      <th>Order</th>
      <th>Invoice Recipient</th>
      <th>Email</th>
      <th>Date</th>
      <th>Total</th>
      <th>Invoice Status</th>
      <th>Order Status</th>
      <th>Manage Orders</th>
    </tr>
  </thead>

  <tbody>
    {orders.map((order) => (
      <tr key={order.id}>
        <td>#{order.id}</td>

        <td>
          {order.company_name ||
            order.invoice_name ||
            "Missing Name"}
        </td>

        <td>{order.invoice_email}</td>
        <td>{formatDate(order.created_at)}</td>

        <td>{formatPrice(order.total_amount)}</td>
        <td>{order.payment_status}</td>
        
        <td>{orderStatusLabels[order.order_status] ||
            order.order_status}</td>
        



        <td className="order-action-cell">
          <button
              className="manage-order-button"
            type="button"
            aria-expanded={selectedOrder?.id === order.id}
            onClick={() => handleSelectOrder(order.id)}
          >
            Manage order
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
      )}

      {isOrderLoading && (
  <Loader message="Loading order details..." />
)}

{selectedOrder && !isOrderLoading && (
  <section className="order-info">
    
    <h2>Order #{selectedOrder.id}</h2>
    <div className="status-control">

    <label htmlFor="order-status">Order Status</label>

  <select
    id="order-status"
    value={selectedStatus}
    onChange={(event) =>
      setSelectedStatus(event.target.value)
    }
    disabled={isStatusSaving || isInvoiceStatusSaving}
  >
    <option value="new">New</option>
    <option value="processing">Processing</option>
    <option value="completed">Completed</option>
    <option value="cancelled">Cancelled</option>
  </select>


<button
  type="button"
  onClick={handleSaveOrderStatus}
  disabled={
    isStatusSaving ||
    selectedStatus === selectedOrder.order_status
  }
>
  {isStatusSaving ? "Save..." : "Save status"}
</button>

{isStatusSaving && <p>Save status...</p>}
{statusMessage && (
  <p role="status">{statusMessage}</p>
)}

</div>
<div className="status-control">

<h3>Invoice Status</h3>

<label htmlFor="invoice-status">
  Invoice Status
</label>

<select
  id="invoice-status"
  value={selectedInvoiceStatus}
  onChange={(event) =>
    setSelectedInvoiceStatus(event.target.value)
  }
  disabled={isInvoiceStatusSaving}
>
  <option value="unpaid">Unpaid</option>
  <option value="paid">Paid</option>
  <option value="overdue">Overdue</option>
  <option value="refunded">Refunded</option>
</select>

<button
  type="button"
  onClick={handleSaveInvoiceStatus}
  disabled={
    isInvoiceStatusSaving ||
    selectedInvoiceStatus ===
      selectedOrder.invoice_status
  }
>
  {isInvoiceStatusSaving
    ? "Saving..."
    : "Save Invoice Status"}
</button>

{invoiceStatusMessage && (
  <p role="status">{invoiceStatusMessage}</p>
)}
</div>


<h3>Recipient Information</h3>

    <p>
      Name:{" "}
      {selectedOrder.invoice_name ||
        selectedOrder.company_name}
    </p>

    <p>E-post: {selectedOrder.invoice_email}</p>

    {selectedOrder.organization_number && (
      <p>
        Organization Number:{" "}
        {selectedOrder.organization_number}
      </p>
    )}

    <p>
      Adress: {selectedOrder.address},{" "}
      {selectedOrder.postal_code} {selectedOrder.city}
    </p>

    <h3>Items</h3>

    {selectedOrder.items.map((item) => (
      <article key={item.id}>
        <h4>{item.course_title}</h4>

        <p>
          Price: {formatPrice(item.price_at_purchase)}
        </p>

        <p>Quantity: {item.quantity}</p>

        {item.start_date ? (
          <p>
            Course Date: {formatDate(item.start_date)}
          </p>
        ) : (
          <p>Date according to agreement</p>
        )}

        {item.city && (
          <p>
            Location: {item.city}
            {item.address && `, ${item.address}`}
          </p>
        )}

        <h5>Participants</h5>

        {item.participants.map((participant) => (
          <p key={participant.id}>
            {participant.first_name}  {" "}
            {participant.last_name} {" "}
            {participant.email}
          </p>
        ))}
      </article>
    ))}

    {(selectedOrder.book_items ?? []).length > 0 && (
  <>
    <h3>Books</h3>

    {selectedOrder.book_items.map((book) => (
      <article key={`book-${book.id}`}>
        <h4>{book.book_title}</h4>

        <p>SKU: {book.book_sku}</p>

        <p>
          Price: {formatPrice(book.price_at_purchase)}
        </p>

        <p>Quantity: {book.quantity}</p>

        <p>
          Subtotal:{" "}
          {formatPrice(
            Number(book.price_at_purchase) * book.quantity
          )}
        </p>
      </article>
    ))}
  </>
)}

<h3>Shipping</h3>

<p>
  Method:{" "}
  {shippingMethodLabels[selectedOrder.shipping_method] ??
    selectedOrder.shipping_method ??
    "No shipping required"}
</p>

<p>
  Shipping cost:{" "}
  {formatPrice(selectedOrder.shipping_price ?? 0)}
</p>

{selectedOrder.shipping_address && (
  <>
    <h4>Delivery address</h4>

    <p>{selectedOrder.shipping_address.name}</p>
    <p>{selectedOrder.shipping_address.street}</p>

    <p>
      {selectedOrder.shipping_address.postalCode}{" "}
      {selectedOrder.shipping_address.city}
    </p>

    <p>{selectedOrder.shipping_address.countryCode}</p>
  </>
)}

{selectedOrder.shipping_service_point && (
  <>
    <h4>Selected service point</h4>

    <p>
      {selectedOrder.shipping_service_point.name}
    </p>

    <p>
      {selectedOrder.shipping_service_point.address}
    </p>

    <p>
      {selectedOrder.shipping_service_point.postalCode}{" "}
      {selectedOrder.shipping_service_point.city}
    </p>

    <p>
      Service point ID:{" "}
      {selectedOrder.shipping_service_point.countryCode}
      {":"}
      {selectedOrder.shipping_service_point.id}
    </p>
  </>
)}

{selectedOrder.shipping_estimate?.available && (
  <p>
    Estimated delivery:{" "}
    {selectedOrder.shipping_estimate.arrivalDate
      ? new Date(
          `${selectedOrder.shipping_estimate.arrivalDate}T12:00:00Z`
        ).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Europe/Stockholm",
        })
      : selectedOrder.shipping_estimate.dayRange
        ? `${selectedOrder.shipping_estimate.dayRange.min}–${selectedOrder.shipping_estimate.dayRange.max} days`
        : "Unavailable"}
  </p>
)}

    <p>
      Total:{" "}
      <strong>
        {formatPrice(selectedOrder.total_amount)}
      </strong>
    </p>



<button
  type="button"
    className="btn-style"
  onClick={handleCloseOrder}
  disabled={isStatusSaving || isInvoiceStatusSaving}
>
  Close Order
</button>

  </section>
)}
    </section>
  );
}



export default AdminOrdersPage;