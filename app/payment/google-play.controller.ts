import { Request, Response } from "express";
import googlePlayService from "./google-play.service";
import { editUser } from "../user/user.service";

/**
 * Verify subscription purchase from the app
 */
export const verifySubscription = async (req: Request, res: Response) => {
  try {
    const { purchaseToken, productId, packageName } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!purchaseToken || !productId || !packageName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify with Google Play
    const subscription = await googlePlayService.verifySubscriptionPlugin(
      packageName,
      productId,
      purchaseToken,
    );

    // Check if valid
    // expiryTimeMillis is in milliseconds string
    const expiryTime = parseInt(subscription.expiryTimeMillis || "0");
    const currentTime = Date.now();

    if (expiryTime < currentTime) {
      return res.status(400).json({
        success: false,
        error: "Subscription expired",
        details: subscription,
      });
    }

    // Determine plan type from productId
    let planType: "monthly" | "yearly" = "monthly";
    if (productId.toLowerCase().includes("yearly")) {
      planType = "yearly";
    }

    // Update user subscription
    const updatedUser = await editUser(userId, {
      subscriptionStatus: "active",
      subscriptionPlan: planType,
      subscriptionEndDate: new Date(expiryTime),
      paymentStatus: "verified",
      lastTransactionId: purchaseToken, // Store purchase token as transaction ID
    });

    return res.status(200).json({
      success: true,
      message: "Subscription verified and activated",
      user: updatedUser,
      subscription,
    });
  } catch (error: any) {
    console.error("Verify subscription error:", error);
    return res.status(500).json({
      error: "Failed to verify subscription",
      message: error.message,
    });
  }
};
