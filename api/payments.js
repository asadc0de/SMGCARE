export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://smgcares.org');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', 'https://smgcares.org');

  const { token, amount, registrantEmail, packageName, sponsorId, golferDetails, buyerName } = req.body;

  let source = "Unknown";
  if (golferDetails) source = "GolfRegister";
  else if (sponsorId) source = "SponsorDialog";
  else if (packageName === "Custom Donation") source = "CustomDonationModal";
  else source = "GolfRegister";

  const logPurchase = async (status, sqPaymentId, failureMsg) => {
    try {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'smgcares-a8f14';
      const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/purchases`;
      
      const logPayload = {
        fields: {
          timestamp: { timestampValue: new Date().toISOString() },
          buyerName: { stringValue: buyerName || "Unknown" },
          buyerEmail: { stringValue: registrantEmail || "Unknown" },
          packageName: { stringValue: packageName || "Unknown" },
          amount: { integerValue: Math.floor((amount || 0) / 100) },
          paymentStatus: { stringValue: status },
          failureReason: failureMsg ? { stringValue: failureMsg } : { nullValue: null },
          squarePaymentId: sqPaymentId ? { stringValue: sqPaymentId } : { nullValue: null },
          source: { stringValue: source }
        }
      };

      await fetch(firebaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logPayload)
      });
    } catch (logError) {
      console.error("Failed to log purchase to Firestore:", logError);
    }
  };

  try {
    const response = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        source_id: token,
        amount_money: {
          amount: amount,
          currency: 'USD',
        },
        idempotency_key: crypto.randomUUID(),
        note: packageName,
        buyer_email_address: registrantEmail,
      }),
    });

    const data = await response.json();

    if (response.ok && data.payment?.status === 'COMPLETED') {
      await logPurchase("success", data.payment.id, null);
      return res.status(200).json({ success: true, payment: data.payment });
    } else {
      const errorMsg = data.errors?.[0]?.detail || 'Payment failed';
      await logPurchase("failed", null, errorMsg);
      return res.status(400).json({ 
        success: false, 
        error: errorMsg 
      });
    }
  } catch (error) {
    await logPurchase("failed", null, error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
