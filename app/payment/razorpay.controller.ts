import { Request, Response } from "express";
import razorpayService from "./razorpay.service";
import { editUser } from "../user/user.service";

/**
 * Create Razorpay order
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!plan || !["Monthly", "Yearly"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    // Calculate amount in paise (100 paise = 1 INR)
    const amount = plan === "Monthly" ? 9900 : 117800; // ₹99 or ₹1178

    // Create Razorpay order
    const order = await razorpayService.createOrder({
      amount,
      currency: "INR",
      receipt: `order_${userId.slice(-6)}_${Date.now()}`,
      notes: {
        userId,
        plan,
      },
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return res.status(500).json({
      error: "Failed to create order",
      message: error.message,
    });
  }
};

/**
 * Verify payment and update subscription
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } =
      req.body;

    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify signature
    const isValid = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment signature",
      });
    }

    // Fetch payment details
    const paymentDetails =
      await razorpayService.getPaymentDetails(razorpay_payment_id);

    if (
      paymentDetails.status !== "captured" &&
      paymentDetails.status !== "authorized"
    ) {
      return res.status(400).json({
        success: false,
        error: "Payment not successful",
      });
    }

    // Calculate subscription end date
    const subscriptionEndDate = new Date();
    if (plan === "Monthly") {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else if (plan === "Yearly") {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    }

    // Update user subscription
    const updatedUser = await editUser(userId, {
      subscriptionStatus: "active",
      subscriptionPlan: plan.toLowerCase() as "monthly" | "yearly", // Convert to lowercase
      subscriptionEndDate: subscriptionEndDate, // Pass Date object, not string
      paymentStatus: "verified", // Use "verified" instead of "completed"
      lastTransactionId: razorpay_payment_id,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified and subscription activated",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return res.status(500).json({
      error: "Failed to verify payment",
      message: error.message,
    });
  }
};

/**
 * Handle Razorpay webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"] as string;
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = razorpayService.verifyWebhookSignature(
      webhookBody,
      webhookSignature,
    );

    if (!isValid) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log("Razorpay webhook event:", event);

    // Handle different webhook events
    switch (event) {
      case "payment.captured":
        // Payment successful
        console.log("Payment captured:", payload.payment.entity.id);
        break;

      case "payment.failed":
        // Payment failed
        console.log("Payment failed:", payload.payment.entity.id);
        break;

      case "order.paid":
        // Order paid
        console.log("Order paid:", payload.order.entity.id);
        break;

      default:
        console.log("Unhandled webhook event:", event);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};
