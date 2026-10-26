import express from "express";
import { getPaymentConfirmation } from "../controllers/paymentController.js";
const router = express.Router();
router.get("/confirmation", getPaymentConfirmation);
export default router;
