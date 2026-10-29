import express from "express";
import cors from "cors";
import courseRoutes from "../../backend/routes/courseRoutes.js";
import courseSessionRoutes from "../../backend/routes/courseSessionRoutes.js";
import orderRoutes from "../../backend/routes/orderRoutes.js";
import locationRoutes from "../../backend/routes/locationRoutes.js";
import currencyRoutes from "../../backend/routes/currencyRoutes.js";
import bookRoutes from "../../backend/routes/bookRoutes.js";
import catalogRoutes from "../../backend/routes/catalogRoutes.js";
import searchRoutes from "../../backend/routes/searchRoutes.js";
import paymentRoutes from "../../backend/routes/paymentRoutes.js";
import productImageRoutes from "../../backend/routes/productImageRoutes.js";
import { stripeWebhook } from "../../backend/controllers/paymentController.js";
import errorHandler from "../../backend/middleware/errorHandler.js";
import shippingRoutes from "../../backend/routes/shippingRoutes.js";

const app = express();

app.use(cors());

// Signaturkontrollen kräver rå request-body.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.use("/api/payments", paymentRoutes);
app.use("/api/product-images", productImageRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/course-sessions", courseSessionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/search", searchRoutes);
app.use(errorHandler);
app.use("/api/shipping", shippingRoutes);

export default app;
