import {
  startGoogleLogin,
  googleCallback,
} from "../controllers/googleAuthController.js";

import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
} from "../controllers/authController.js";
import {
  optionalAuth,
  requireAuth,
  requireTrustedOrigin,
} from "../middleware/authMiddleware.js";
import {
  loginIpLimit,
  loginEmailLimit,
  registerIpLimit,
} from "../middleware/authRateLimit.js";

const router = Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post(
  "/register",
  requireTrustedOrigin,
  registerIpLimit,
  register
);

router.post(
  "/login",
  requireTrustedOrigin,
  loginIpLimit,
  loginEmailLimit,
  login
);

router.post(
  "/logout",
  requireTrustedOrigin,
  optionalAuth,
  logout
);

router.get(
  "/me",
  optionalAuth,
  requireAuth,
  getMe
);

router.get("/google", startGoogleLogin);

router.get("/google/callback", googleCallback);

export default router;