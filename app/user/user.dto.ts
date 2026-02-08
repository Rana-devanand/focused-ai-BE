import { type BaseSchema } from "../common/dto/base.dto";

export interface IUser extends BaseSchema {
  name: string;
  email: string;
  active?: boolean;
  role: "USER" | "ADMIN";
  password?: string;
  refreshToken?: string;
  blocked?: boolean;
  blockReason?: string;
  provider: ProviderType;
  facebookId?: string;
  image?: string;
  linkedinId?: string;
  googleAccessToken?: string;
  lastEmailFetch?: Date;
  fcmToken?: string;
  notificationsEnabled?: boolean;
  currentStreak?: number;
  lastActiveDate?: Date;
  totalActiveMinutes?: number;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?:
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "paused";
  subscriptionPlan?: "monthly" | "yearly";
  subscriptionEndDate?: Date;
  paymentStatus?: "pending" | "verified" | "rejected";
  lastTransactionId?: string;
  subscriptionPrice?: string;
}

export enum ProviderType {
  GOOGLE = "google",
  MANUAL = "manual",
  FACEBOOK = "facebook",
  APPLE = "apple",
  LINKEDIN = "linkedin",
  STRIPE = "stripe",
  MANUAL_QR = "manual_qr",
}
