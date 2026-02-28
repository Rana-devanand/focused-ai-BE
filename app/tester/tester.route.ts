import express from "express";
import * as testerController from "./tester.controller";
import { roleAuth } from "../common/middleware/role-auth.middleware";

const router = express.Router();

router.post("/", testerController.addTester);
router.get("/", roleAuth(["ADMIN"]), testerController.getAllTesters);
router.patch(
  "/:id/status",
  roleAuth(["ADMIN"]),
  testerController.updateTesterStatus,
);

export default router;
