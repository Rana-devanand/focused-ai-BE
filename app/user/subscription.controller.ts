import { type Request, type Response } from "express";
import asyncHandler from "express-async-handler";
import createHttpError from "http-errors";
import * as stripeService from "../common/services/stripe.service";
import * as userService from "./user.service";

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  console.log("Checkout Body:", req.body);
  console.log("Checkout User:", (req as any).user);
  const { priceId } = req.body;
  const user = (req as any).user;

  // if (!priceId) {
  //   throw createHttpError(400, "PriceId is required");
  // }

  const session = await stripeService.createCheckoutSession(
    user.id,
    user.email,
    priceId,
  );

  res.json({ url: session.url });
});

export const portal = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (!user.stripeCustomerId) {
    res.status(400);
    throw new Error("No subscription found");
  }

  const session = await stripeService.createCustomerPortal(
    user.stripeCustomerId,
  );

  res.json({ url: session.url });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body, signature as string);
  } catch (err: any) {
    console.error(`Webhook signature verification failed:  ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const customerId = session.customer as string;
      // Update user with subscription details
      if (userId) {
        await userService.editUser(userId, {
          subscriptionStatus: "active",
          stripeCustomerId: customerId,
          // You might want to map price ID to plan name here
          subscriptionPlan: "monthly", // Simplify for now
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Rough approximation
        });
      }
      break;
    case "customer.subscription.deleted":
      // Handle cancellation
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});
