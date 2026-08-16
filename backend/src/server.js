import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import courseRoutes from "./routes/courseRoutes.js";
import courseSessionRoutes from "./routes/courseSessionRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/courses", courseRoutes);
app.use("/api/course-sessions", courseSessionRoutes);

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

app.listen(port, () => {
  console.log(`Servern körs på http://localhost:${port}`);
});