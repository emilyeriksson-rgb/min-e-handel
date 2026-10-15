import express from "express";
import cors from "cors";

import pool from "../../backend/config/db.js";
import courseRoutes from "../../backend/routes/courseRoutes.js";
import courseSessionRoutes from "../../backend/routes/courseSessionRoutes.js";
import orderRoutes from "../../backend/routes/orderRoutes.js";
import locationRoutes from "../../backend/routes/locationRoutes.js";
import bookRoutes from "../../backend/routes/bookRoutes.js";
import errorHandler from "../../backend/middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/courses", courseRoutes);
app.use("/api/course-sessions", courseSessionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/books", bookRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "E-handelns API fungerar!",
  });
});

app.get("/api/database-test", async (req, res) => {
  try {
   const result = await pool.query(`
  SELECT
    NOW() AS current_time,
    current_database() AS database_name,
    current_schema() AS schema_name
`);

res.json({
  message: "Anslutningen till PostgreSQL fungerar!",
  databaseTime: result.rows[0].current_time,
  databaseName: result.rows[0].database_name,
  schemaName: result.rows[0].schema_name,
});
  } catch (error) {
    console.error("Databasfel:", error);

    res.status(500).json({
      message: "Kunde inte ansluta till databasen.",
    });
  }
});

app.use(errorHandler);

export default app;