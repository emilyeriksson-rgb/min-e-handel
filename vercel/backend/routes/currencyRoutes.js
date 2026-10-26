import { Router } from "express";
import { getRates } from "../integrations/currencyAdapter.js";

const router = Router();

router.get("/", async (_req, res) => {
  const rates = await getRates();
  res.json(rates);
});

export default router;