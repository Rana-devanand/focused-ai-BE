import { Router } from "express";
import * as controller from "./admin.controller";
import { roleAuth } from "../common/middleware/role-auth.middleware";

const router = Router();

// Apply ADMIN role auth to all these endpoints
router.use(roleAuth(["ADMIN"]));

router.get("/emails", controller.getEmails);
router.get("/chats", controller.getChats);
router.get("/subscriptions", controller.getSubscriptions);
router.post("/notifications/generate", controller.generateNotification);
router.post("/notifications/send", controller.sendNotification);

export default router;
