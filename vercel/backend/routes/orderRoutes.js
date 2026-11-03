import express from "express";
import {
  getAllOrders,
  getOrderById,
  getMyOrders,
  createOrder,
  updateOrderStatus,
  updateInvoiceStatus,
} from "../controllers/orderController.js";
import {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireTrustedOrigin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

const adminRead = [
  optionalAuth,
  requireAdmin,
];

const adminWrite = [
  optionalAuth,
  requireAdmin,
  requireTrustedOrigin,
];

router.get(
  "/mine",
  optionalAuth,
  requireAuth,
  getMyOrders
);

router.get("/", adminRead, getAllOrders);

router.get("/:id", adminRead, getOrderById);

router.post(
  "/",
  requireTrustedOrigin,
  optionalAuth,
  createOrder
);

router.patch(
  "/:id/status",
  adminWrite,
  updateOrderStatus
);

router.patch(
  "/:id/invoice-status",
  adminWrite,
  updateInvoiceStatus
);

export default router;