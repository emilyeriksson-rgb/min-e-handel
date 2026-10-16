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
import { XMLParser } from "fast-xml-parser";
import searchRoutes from "./routes/searchRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/courses", courseRoutes);
app.use("/api/course-sessions", courseSessionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/catalog", catalogRoutes);
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

app.listen(port, () => {
  console.log(`Servern körs på http://localhost:${port}`);
});