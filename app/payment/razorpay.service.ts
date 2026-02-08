import Razorpay from "razorpay";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

interface CreateOrderParams {
  amount: number; // in paise (100 paise = 1 INR)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Create a Razorpay order
 */
export const createOrder = async (params: CreateOrderParams) => {
  try {
    const order = await razorpay.orders.create({
      amount: params.amount,
      currency: params.currency || "INR",
      receipt: params.receipt || `receipt_${Date.now()}`,
      notes: params.notes || {},
    });

    console.log("Razorpay order created:", order.id);
    return order;
  } catch (error: any) {
    console.error("Razorpay order creation failed:", error);
    throw new Error(`Failed to create order: ${error.message}`);
  }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyPaymentSignature = (
  params: VerifyPaymentParams,
): boolean => {
  try {
    const crypto = require("crypto");

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${params.razorpay_order_id}|${params.razorpay_payment_id}`)
      .digest("hex");

    return generatedSignature === params.razorpay_signature;
  } catch (error: any) {
    console.error("Signature verification failed:", error);
    return false;
  }
};

/**
 * Fetch payment details
 */
export const getPaymentDetails = async (paymentId: string) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error: any) {
    console.error("Failed to fetch payment details:", error);
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
};

/**
 * Verify webhook signature
 */
export const verifyWebhookSignature = (
  webhookBody: string,
  webhookSignature: string,
): boolean => {
  try {
    const crypto = require("crypto");

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "")
      .update(webhookBody)
      .digest("hex");

    return expectedSignature === webhookSignature;
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error);
    return false;
  }
};

export default {
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  verifyWebhookSignature,
};
