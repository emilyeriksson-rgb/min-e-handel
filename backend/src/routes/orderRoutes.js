import express from "express";
import { getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    updateInvoiceStatus,
 } from "../controllers/orderController.js";

const router = express.Router();

router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/invoice-status", updateInvoiceStatus);

export default router;