import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import * as chatService from "./ai-chat.service";
import { createResponse } from "../common/helper/response.hepler";

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id!;
  const { message } = req.body;

  if (!message) {
    res.status(400);
    throw new Error("Message is required");
  }

  const response = await chatService.processUserMessage(userId, message);
  res.send(createResponse(response, "Message processed successfully"));
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id!;
  const limit = parseInt(req.query.limit as string) || 20;

  const history = await chatService.getChatHistory(userId, limit);
  res.send(createResponse(history, "Chat history retrieved successfully"));
});
