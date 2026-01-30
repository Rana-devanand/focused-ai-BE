import express from "express";
import * as controller from "./passive-intelligence.controller";
import { roleAuth } from "../common/middleware/role-auth.middleware";

const router = express.Router();

router.get(
  "/dashboard",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getDashboardData,
);
router.post(
  "/events/sync",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.syncEvents,
);
router.post(
  "/stats",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.updateStats,
);
router.post(
  "/app-usage/update",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.updateAppUsage,
);
router.post(
  "/analyze/emails",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.analyzeEmails,
);

export default router;
