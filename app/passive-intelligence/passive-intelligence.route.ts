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
router.post(
  "/fetch-analyze-emails",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.fetchAndAnalyzeEmails,
);
router.get(
  "/email-tasks",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getEmailTasks,
);
router.patch(
  "/email-tasks/:taskId",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.updateTaskStatus,
);
router.post(
  "/email-tasks/create",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.createManualTask,
);

export default router;
