import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { createResponse } from "../common/helper/response.hepler";
import * as adminService from "./admin.service";

export const getEmails = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || "";

  const result = await adminService.getAllEmailsPaginated(page, limit, search);
  res.send(createResponse(result, "Emails retrieved successfully"));
});

export const getChats = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || "";

  const result = await adminService.getAllChatsPaginated(page, limit, search);
  res.send(createResponse(result, "Chats retrieved successfully"));
});

export const getSubscriptions = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await adminService.getAllSubscriptionsPaginated(
      page,
      limit,
      search,
    );
    res.send(createResponse(result, "Subscriptions retrieved successfully"));
  },
);

export const generateNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400);
      throw new Error("Prompt is required");
    }

    const result = await adminService.generateCustomNotification(prompt);
    if (!result) {
      res.status(500);
      throw new Error("Failed to generate notification");
    }

    res.send(createResponse(result, "Generated notification successfully"));
  },
);

export const sendNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const { userIds, title, body } = req.body;

    if (!userIds || !title || !body) {
      res.status(400);
      throw new Error("Missing required fields (userIds, title, body)");
    }

    const result = await adminService.sendCustomNotification(
      userIds,
      title,
      body,
    );
    res.send(createResponse(result, "Notifications processed"));
  },
);
