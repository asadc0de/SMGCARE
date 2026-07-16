import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const privateToken = process.env.CLOVER_PRIVATE_TOKEN;
  if (!privateToken) {
    console.error("❌ CLOVER_PRIVATE_TOKEN is not set in environment variables");
    res.status(500).json({
      error: "Payment gateway is not configured. Contact support.",
    });
    return;
  }

  const isSandbox = process.env.CLOVER_ENV !== "production";
  const CLOVER_CHARGES_URL = isSandbox
    ? "https://scl-sandbox.dev.clover.com/v1/charges"
    : "https://scl.clover.com/v1/charges";

  const { token, amount, registrantEmail, packageName, golferDetails } =
    req.body ?? {};

  if (!token || !amount) {
    res.status(400).json({ error: "Missing required fields: token and amount" });
    return;
  }

  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  try {
    const idempotencyKey = crypto.randomUUID();

    const forwardedFor =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "0.0.0.0";

    console.log(`\n--- NEW PAYMENT ATTEMPT (Clover) ---`);
    console.log(
      `Package: ${packageName} | Amount: $${(amount / 100).toFixed(2)} | Email: ${registrantEmail}`
    );
    console.log(`Idempotency Key: ${idempotencyKey}`);

    const cloverResponse = await fetch(CLOVER_CHARGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${privateToken}`,
        "idempotency-key": idempotencyKey,
        "x-forwarded-for": forwardedFor,
      },
      body: JSON.stringify({
        amount: amount,
        currency: "usd",
        source: token,
        description: packageName ? `Registration: ${packageName}` : "SMG Cares Payment",
      }),
    });

    let data: any;
    try {
      data = await cloverResponse.json();
    } catch {
      console.error("❌ Clover returned a non-JSON response");
      res.status(502).json({ error: "Payment gateway returned an invalid response" });
      return;
    }

    if (!cloverResponse.ok) {
      const errorDetail =
        data?.error?.message ||
        data?.errors?.[0]?.message ||
        data?.message ||
        "Payment failed";
      console.error(`❌ CLOVER API ERROR: ${errorDetail}`);
      console.log(`---------------------------\n`);
      res.status(400).json({ error: errorDetail });
      return;
    }

    console.log(`✅ PAYMENT SUCCESSFUL!`);
    console.log(`Transaction ID: ${data.id}`);
    console.log(`Status: ${data.status}`);
    console.log(`---------------------------\n`);

    res.status(200).json({ success: true, payment: { id: data.id, status: data.status } });
  } catch (err: any) {
    console.error(`❌ SERVER ERROR:`, err?.message ?? err);
    console.log(`---------------------------\n`);
    res.status(500).json({ error: "Internal server error. Please try again." });
  }
}
