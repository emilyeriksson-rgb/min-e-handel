import express from "express";
import pool from "../../backend/config/db.js";

const app = express();

app.get("/", (req, res) => {
  res.json({
    test: "Express fungerar",
  });
});

app.get("/api/database-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS database_time"
    );

    res.json({
      message: "Databasanslutningen fungerar",
      database_time: result.rows[0].database_time,
    });
  } catch (error) {
    console.error("Databasanslutningen misslyckades:", error);

    res.status(500).json({
      message: "Kunde inte ansluta till databasen",
    });
  }
});

export default app;