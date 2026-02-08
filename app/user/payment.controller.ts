import { type Request, type Response } from "express";
import asyncHandler from "express-async-handler";
import * as userService from "./user.service";

export const submitPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { transactionId, plan, upiResponse } = req.body;
    const user = (req as any).user;

    if (!transactionId || !plan) {
      res.status(400);
      throw new Error("Transaction ID and Plan are required");
    }

    // Validate UPI transaction ID format (basic validation)
    if (transactionId.length < 10) {
      res.status(400);
      throw new Error("Invalid transaction ID format");
    }

    // Update user with pending payment status
    const updatedUser = await userService.editUser(user.id, {
      paymentStatus: "pending",
      lastTransactionId: transactionId,
      subscriptionPlan: plan,
      // Store additional UPI response data if needed
      // Do not set status to active yet. Admin must approve.
    });

    res.json({ success: true, user: updatedUser });
  },
);

export const approvePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.body;

    // In a real app, check if req.user is admin

    const updatedUser = await userService.editUser(userId, {
      paymentStatus: "verified",
      subscriptionStatus: "active",
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    res.json({ success: true, user: updatedUser });
  },
);
