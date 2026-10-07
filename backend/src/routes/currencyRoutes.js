import { Router } from "express";
import { getRates } from "../integrations/currencyAdapter.ts";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rates = await getRates();

    res.json(rates);
  } catch (error) {
    console.error("Kunde inte hämta valutakurser:", error);

    res.status(502).json({
      message: "Kunde inte hämta valutakurser. Försök igen.",
    });
  }
});

export default router;