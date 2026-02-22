import express from "express";
import * as controller from "./passive-intelligence.controller";
import { roleAuth } from "../common/middleware/role-auth.middleware";

const router = express.Router();

router.get(
  "/dashboard",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getDashboardData,
);
router.get(
  "/insights",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getInsightsData,
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
router.delete(
  "/email-tasks",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.deleteTasks,
);

router.get(
  "/suggested-actions",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getSuggestedActions,
);

router.get(
  "/daily-mood",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getDailyMood,
);

router.post(
  "/daily-mood",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.logDailyMood,
);

router.post(
  "/ai-reply/questions",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getReplyQuestions,
);

router.post(
  "/ai-reply/draft",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getReplyDraft,
);

router.post(
  "/ai-compose/questions",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getComposeQuestions,
);

router.post(
  "/ai-compose/draft",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.getComposeDraft,
);

router.post(
  "/send-email",
  roleAuth(["USER", "ADMIN"], ["active", "blocked"]),
  controller.sendEmail,
);

export default router;
