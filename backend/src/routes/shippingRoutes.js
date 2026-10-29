import { Router } from "express";
import {
  getShippingQuote,
} from "../controllers/shippingController.js";
import {
  getNearestServicePoints,
  getEstimatedDelivery,
} from "../integrations/postnordAdapter.js";

const router = Router();

async function getServicePoints(req, res) {
  res.set("Cache-Control", "no-store");

  try {
    const servicePoints = await getNearestServicePoints(
      req.query.postalCode
    );

    return res.json({ servicePoints });
  } catch (error) {
    const status = [400, 503].includes(error.status)
      ? error.status
      : 500;

    return res.status(status).json({
      message: status === 500
        ? "Kunde inte hämta ombud."
        : error.message,
    });
  }
}

router.get("/service-points", getServicePoints);

async function getDeliveryEstimate(req, res) {
  res.set("Cache-Control", "no-store");

  try {
    const estimate = await getEstimatedDelivery({
      postalCode: req.query.postalCode,
      method: req.query.method,
    });

    return res.json(estimate);
  } catch (error) {
    const status = [400, 503].includes(error.status)
      ? error.status
      : 500;

    return res.status(status).json({
      message: status === 500
        ? "Kunde inte beräkna leveranstiden."
        : error.message,
    });
  }
}

router.get("/delivery-estimate", getDeliveryEstimate);

router.post("/quote", getShippingQuote);

export default router;