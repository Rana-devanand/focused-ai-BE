import { google } from "googleapis";
import path from "path";

// Initialize Google Play Developer API
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../../service-account.json"), // Ensure this path is correct
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});

const androidPublisher = google.androidpublisher({
  version: "v3",
  auth,
});

/**
 * Verify a subscription purchase
 */
export const verifySubscriptionPlugin = async (
  packageName: string,
  subscriptionId: string,
  purchaseToken: string,
) => {
  try {
    // If testing mode, mock the response because Developer API might not be linked yet
    if (subscriptionId.includes("test")) {
      console.log("Mocking Google Play verification for Test Plan...");
      return {
        startTimeMillis: Date.now().toString(),
        expiryTimeMillis: (Date.now() + 24 * 60 * 60 * 1000).toString(), // 1 day
        autoRenewing: false,
        paymentState: 1, // Payment received
      };
    }

    const response = await androidPublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    return response.data;
  } catch (error) {
    console.error("Error verifying subscription:", error);
    throw new Error("Failed to verify subscription");
  }
};

/**
 * Acknowledge a subscription (if needed securely from backend)
 */
export const acknowledgeSubscription = async (
  packageName: string,
  subscriptionId: string,
  purchaseToken: string,
) => {
  try {
    await androidPublisher.purchases.subscriptions.acknowledge({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });
    return true;
  } catch (error) {
    console.error("Error acknowledging subscription:", error);
    return false;
  }
};

export default {
  verifySubscriptionPlugin,
  acknowledgeSubscription,
};
