import { getDBPool } from "../common/services/database.service";
import * as userService from "../user/user.service";
import { sendEmail } from "../common/services/email.service";

export type SubscriptionStatus = "TRIAL" | "PAID" | "EXPIRED";

interface SubscriptionCheckResult {
  status: SubscriptionStatus;
  daysLeft?: number;
  planName?: string;
  expiryDate?: Date;
}

/**
 * Check if a user has access to premium features.
 * Access is granted if:
 * 1. User is within 7-day free trial (based on account creation).
 * 2. User has an active paid subscription.
 */
export const getUserSubscriptionStatus = async (
  userId: string,
): Promise<SubscriptionCheckResult> => {
  const pool = getDBPool();

  // 1. Check for active paid subscription
  const subQuery = `
    SELECT * FROM subscriptions 
    WHERE user_id = $1 
    AND status = 'active'
    AND (current_period_end > NOW() OR current_period_end IS NULL)
    LIMIT 1
  `;
  const subResult = await pool.query(subQuery, [userId]);

  if (subResult.rows.length > 0) {
    const sub = subResult.rows[0];
    const daysLeft = sub.current_period_end
      ? Math.ceil(
          (new Date(sub.current_period_end).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : 30; // Default if null (e.g. lifetime or unknown)

    return {
      status: "PAID",
      daysLeft,
      planName: sub.plan_id,
      expiryDate: sub.current_period_end,
    };
  }

  // 2. Check for active paid subscription in USERS table (Fallback)
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.subscriptionEndDate) {
    const endDate = new Date(user.subscriptionEndDate);
    if (endDate > new Date()) {
      const daysLeft = Math.ceil(
        (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      console.log(
        `[SubscriptionCheck] Found User Sub: Plan=${user.subscriptionPlan}, End=${endDate.toISOString()}`,
      );
      return {
        status: "PAID",
        daysLeft,
        planName: user.subscriptionPlan,
        expiryDate: endDate,
      };
    } else {
      console.log(
        `[SubscriptionCheck] User Sub Expired: End=${endDate.toISOString()}`,
      );
    }
  }

  // 3. Check for Free Trial (7 days from creation)
  const createdAt = new Date(user.created_at!); // Ensure camelCase mapping in userService
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const trialDays = 7;

  console.log(
    `[SubscriptionCheck] Trial Check: Created=${createdAt.toISOString()}, DiffDays=${diffDays}`,
  );

  if (diffDays <= trialDays) {
    return {
      status: "TRIAL",
      daysLeft: trialDays - diffDays + 1, // +1 because day 0 is 1st day
      expiryDate: new Date(
        createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000,
      ),
    };
  }

  return {
    status: "EXPIRED",
    daysLeft: 0,
  };
};

/**
 * Checks for expiring trials and subscriptions and sends warning emails.
 * Should be called by a cron job or on app open (throttled).
 */
export const checkAndSendExpiryEmails = async (userId: string) => {
  const status = await getUserSubscriptionStatus(userId);
  const user = await userService.getUserById(userId);

  if (!user || !user.email) return;

  // We should track if email was already sent to avoid spamming.
  // For now, we'll assume this is triggered judiciously or we'd add a 'last_notification_sent' col.

  if (status.status === "TRIAL" && status.daysLeft === 1) {
    // Trial ending tomorrow
    // await sendEmail(user.email, "Your Free Trial Ends Tomorrow!", "Upgrade now to keep using AI features.");
    console.log(`[Email] Sending Trial Warning to ${user.email}`);
  } else if (status.status === "EXPIRED") {
    // Trial expired
    // await sendEmail(user.email, "Your Free Trial Has Expired", "Upgrade now to restore AI features.");
    console.log(`[Email] Sending Expired Notice to ${user.email}`);
  } else if (status.status === "PAID" && status.daysLeft === 7) {
    // Subscription renewing/expiring in 7 days
    // await sendEmail(user.email, "Your Subscription Renews Soon", "Review your plan settings.");
    console.log(`[Email] Sending Renewal Warning to ${user.email}`);
  }
};
