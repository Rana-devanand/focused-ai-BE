export interface ISubscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan_id?: string;
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "unpaid";
  current_period_end?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateCheckoutSessionDto {
  priceId: string;
}
