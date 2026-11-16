import { Router } from "express";

import {
  getOpenIssues,
  reportIssue,
} from "../controllers/githubIssueController.js";

import {
  optionalAuth,
  requireGitHubAdmin,
  requireTrustedOrigin,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use(optionalAuth, requireGitHubAdmin);

router.get("/", getOpenIssues);

router.post("/", requireTrustedOrigin, reportIssue);

export default router;