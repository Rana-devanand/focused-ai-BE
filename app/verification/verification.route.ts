import express from "express";
import * as verificationController from "./verification.controller";
import { roleAuth } from "../common/middleware/role-auth.middleware";

const router = express.Router();

router.get(
  "/installers",
  roleAuth(["ADMIN"]),
  verificationController.getActiveInstallers,
);
router.post(
  "/bulk-email",
  roleAuth(["ADMIN"]),
  verificationController.sendBulkEmail,
);
router.post(
  "/generate-email",
  roleAuth(["ADMIN"]),
  verificationController.generateEmailContent,
);

export default router;
