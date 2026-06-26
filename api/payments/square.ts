import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

// Use a fixed recent stable version
const SQUARE_VERSION = "2024-01-17";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS headers so the browser doesn't block the response ──────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // ── Validate required environment variables ──────────────────────────────
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("❌ SQUARE_ACCESS_TOKEN is not set in environment variables");
    res.status(500).json({
      error: "Payment gateway is not configured. Contact support.",
    });
    return;
  }

  const appId = process.env.VITE_SQUARE_APP_ID ?? "";
  const isSandbox = appId.startsWith("sandbox-");
  const SQUARE_API_URL = isSandbox
    ? "https://connect.squareupsandbox.com/v2/payments"
    : "https://connect.squareup.com/v2/payments";

  // ── Parse & validate request body ────────────────────────────────────────
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

  // ── Call Square Payments API ──────────────────────────────────────────────
  try {
    const idempotencyKey = crypto.randomUUID();

    console.log(`\n--- NEW PAYMENT ATTEMPT ---`);
    console.log(
      `Package: ${packageName} | Amount: $${(amount / 100).toFixed(2)} | Email: ${registrantEmail}`
    );
    console.log(`Idempotency Key: ${idempotencyKey}`);

    const squareResponse = await fetch(SQUARE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": SQUARE_VERSION,
      },
      body: JSON.stringify({
        source_id: token,
        idempotency_key: idempotencyKey,
        amount_money: {
          amount: amount, // in cents
          currency: "USD",
        },
        buyer_email_address: registrantEmail ?? undefined,
        note: packageName ? `Registration: ${packageName}` : "SMG Cares Payment",
        // Store golfer details as metadata
        reference_id: golferDetails
          ? JSON.stringify(golferDetails).slice(0, 40)
          : undefined,
      }),
    });

    // Always read the body — even on error responses
    let data: any;
    try {
      data = await squareResponse.json();
    } catch {
      console.error("❌ Square returned a non-JSON response");
      res.status(502).json({ error: "Payment gateway returned an invalid response" });
      return;
    }

    if (!squareResponse.ok) {
      const errorDetail =
        data?.errors?.[0]?.detail ||
        data?.errors?.[0]?.code ||
        "Payment failed";
      console.error(`❌ SQUARE API ERROR: ${errorDetail}`);
      console.log(`---------------------------\n`);
      res.status(400).json({ error: errorDetail });
      return;
    }

    // ── Success ──────────────────────────────────────────────────────────────
    console.log(`✅ PAYMENT SUCCESSFUL!`);
    console.log(`Transaction ID: ${data.payment?.id}`);
    console.log(`Status: ${data.payment?.status}`);
    console.log(`---------------------------\n`);

    res.status(200).json({ success: true, payment: data.payment });
  } catch (err: any) {
    console.error(`❌ SERVER ERROR:`, err?.message ?? err);
    console.log(`---------------------------\n`);
    res.status(500).json({ error: "Internal server error. Please try again." });
  }
}
