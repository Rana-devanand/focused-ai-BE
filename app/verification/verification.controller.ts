import { type Request, type Response } from "express";
import asyncHandler from "express-async-handler";
import * as verificationService from "./verification.service";
import { createResponse } from "../common/helper/response.hepler";

export const getActiveInstallers = asyncHandler(
  async (req: Request, res: Response) => {
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await verificationService.getActiveInstallers(skip, limit);
    res.send(createResponse(result));
  },
);

export const sendBulkEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { userIds, subject, messageBody } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("User IDs are required and must be a non-empty array");
    }
    const result = await verificationService.sendBulkEmail(
      userIds,
      subject,
      messageBody,
    );
    res.send(createResponse(result, "Bulk email process initiated"));
  },
);

export const generateEmailContent = asyncHandler(
  async (req: Request, res: Response) => {
    const { subject } = req.body;
    if (!subject) {
      throw new Error("Subject is required");
    }
    const result = await verificationService.generateEmailContent(subject);
    res.send(createResponse(result));
  },
);
