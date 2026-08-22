import express from "express";
import { getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
 } from "../controllers/orderController.js";

const router = express.Router();

router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);

export default router;