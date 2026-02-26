import { Checkout } from "@polar-sh/nextjs";

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: "https://www.uptimetr.com/subscription?checkout_id={CHECKOUT_ID}",
  server: "production",
});
