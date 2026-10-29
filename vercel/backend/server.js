import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import courseRoutes from "./routes/courseRoutes.js";
import courseSessionRoutes from "./routes/courseSessionRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import bookRoutes from "./routes/bookRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import productImageRoutes from "./routes/productImageRoutes.js";

import paymentRoutes from "./routes/paymentRoutes.js";
import { stripeWebhook } from "./controllers/paymentController.js";
import shippingRoutes from "./routes/shippingRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json());
app.use("/api/payments", paymentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/course-sessions", courseSessionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/product-images", productImageRoutes);
app.use("/api/shipping", shippingRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "E-handelns API fungerar!",
  });
});

app.get("/api/database-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    res.json({
      message: "Anslutningen till PostgreSQL fungerar!",
      databaseTime: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Databasfel:", error);

    res.status(500).json({
      message: "Kunde inte ansluta till databasen.",
    });
  }
});

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Servern körs på http://localhost:${port}`);
  });
}

export default app;