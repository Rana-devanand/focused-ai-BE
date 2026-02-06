import { Router } from "express";
import * as controller from "./ai-chat.controller";
import { roleAuth } from "../common/middleware/role-auth.middleware";

const router = Router();

router.post("/", roleAuth(["USER"]), controller.sendMessage);
router.get("/history", roleAuth(["USER"]), controller.getHistory);

export default router;
