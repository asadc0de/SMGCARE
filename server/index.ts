import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

// ── Load .env file ────────────────────────────────────────────────────────────
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: isProd
    ? process.env.ALLOWED_ORIGIN || "*"   // set ALLOWED_ORIGIN=https://yourdomain.com in production
    : "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// ── Square payment endpoint ───────────────────────────────────────────────────
const SQUARE_VERSION = "2024-01-17";

app.post("/api/payments/square", async (req, res) => {
  // Validate env vars
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("❌ SQUARE_ACCESS_TOKEN is not set in environment variables");
    res.status(500).json({ error: "Payment gateway is not configured. Contact support." });
    return;
  }

  const appId = process.env.VITE_SQUARE_APP_ID ?? "";
  const isSandbox = appId.startsWith("sandbox-");
  const SQUARE_API_URL = isSandbox
    ? "https://connect.squareupsandbox.com/v2/payments"
    : "https://connect.squareup.com/v2/payments";

  const { token, amount, registrantEmail, packageName, golferDetails } = req.body ?? {};

  console.log(`\n--- NEW PAYMENT ATTEMPT ---`);
  console.log(`Package: ${packageName} | Amount: $${((amount ?? 0) / 100).toFixed(2)} | Email: ${registrantEmail}`);

  // Validate request body
  if (!token || !amount) {
    console.log(`❌ ERROR: Missing required payment fields.`);
    res.status(400).json({ error: "Missing required fields: token and amount" });
    return;
  }

  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  try {
    const idempotencyKey = crypto.randomUUID();
    console.log(`Processing with Square... (Idempotency Key: ${idempotencyKey})`);

    const squareResponse = await fetch(SQUARE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "Square-Version": SQUARE_VERSION,
      },
      body: JSON.stringify({
        source_id: token,
        idempotency_key: idempotencyKey,
        amount_money: {
          amount: amount,   // in cents
          currency: "USD",
        },
        buyer_email_address: registrantEmail ?? undefined,
        note: packageName ? `Registration: ${packageName}` : "SMG Cares Payment",
      }),
    });

    // Always parse the body — even on error responses
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
        data?.errors?.[0]?.message ||
        data?.errors?.[0]?.code ||
        (data?.errors ? JSON.stringify(data.errors) : null) ||
        "Payment failed";
      console.error(`❌ SQUARE API ERROR: ${errorDetail}`);
      console.log(`---------------------------\n`);
      res.status(400).json({ error: errorDetail });
      return;
    }

    console.log(`✅ PAYMENT SUCCESSFUL!`);
    console.log(`Transaction ID: ${data.payment?.id}`);
    console.log(`Status:         ${data.payment?.status}`);
    console.log(`---------------------------\n`);
    res.status(200).json({ success: true, payment: data.payment });

  } catch (error: any) {
    console.error(`❌ SERVER ERROR:`, error?.message ?? error);
    console.log(`---------------------------\n`);
    res.status(500).json({ error: error?.message || "Internal server error. Please try again." });
  }
});

// ── Serve React frontend in production ────────────────────────────────────────
// After `npm run build`, Express serves the compiled React app and handles
// all client-side routes (React Router) by returning index.html.
if (isProd) {
  const distPath = path.join(__dirname, "..", "dist");

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(distPath));

  // All non-API routes → return index.html so React Router works
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  console.log(`📁 Serving static files from: ${distPath}`);
}

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`   Mode: ${isProd ? "production" : "development"}`);
  if (!isProd) {
    console.log(`   API:  http://localhost:${PORT}/api/payments/square`);
  }
});
