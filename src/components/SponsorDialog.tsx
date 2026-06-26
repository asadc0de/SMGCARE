import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { doc, getDoc, setDoc, updateDoc, increment, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

const WEB3FORMS_ACCESS_KEY = "a3cdab0e-c130-42ed-a2f3-107436af5a8a";

type Sponsor = { id?: string; tierName: string; price: string; maxLimit?: number; perks?: string[] };

export function SponsorDialog({ open, onOpenChange, sponsor }: { open: boolean; onOpenChange: (v: boolean) => void; sponsor: Sponsor | null }) {
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState<"card" | "check">("card");
  const [payments, setPayments] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const cardRef = useRef<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // ── Fee calculation ───────────────────────────────────────────────────────
  const baseAmount = parseInt((sponsor?.price || "$0").replace(/[^0-9]/g, ""));
  const fee = Math.round(baseAmount * 0.0275 * 100) / 100;
  const total = baseAmount + fee;

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setFormStep(1);
      setPaymentMethod("card");
      setPaymentSuccess(false);
      setPaymentError(null);
      setCard(null);
      cardRef.current = null;
    }
  }, [open]);

  // ── Square init — only when card is selected ──────────────────────────────
  useEffect(() => {
    if (formStep !== 2 || paymentSuccess || paymentMethod !== "card") return;
    if (card) return;

    const appId = import.meta.env.VITE_SQUARE_APP_ID;
    const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

    if (
      !appId || !locationId ||
      appId === "YOUR_SQUARE_APP_ID" ||
      locationId === "YOUR_SQUARE_LOCATION_ID" ||
      appId.includes("YOUR_") ||
      locationId.includes("YOUR_")
    ) {
      setPaymentError("Square Payment is not configured. Please define VITE_SQUARE_APP_ID and VITE_SQUARE_LOCATION_ID in your .env file.");
      return;
    }

    const isSandbox = appId.startsWith("sandbox-");
    const scriptUrl = isSandbox
      ? "https://sandbox.web.squarecdn.com/v1/square.js"
      : "https://web.squarecdn.com/v1/square.js";

    const initializeSquare = async () => {
      try {
        if (!(window as any).Square) return;
        const sqPayments = (window as any).Square.payments(appId, locationId);
        setPayments(sqPayments);
        const cardObj = await sqPayments.card();
        const container = document.getElementById("square-card-container-sponsor");
        if (!container) return;
        await cardObj.attach("#square-card-container-sponsor");
        cardRef.current = cardObj;
        setCard(cardObj);
      } catch (e: any) {
        console.error("Square initialization failed:", e);
        setPaymentError(e.message || "Failed to initialize payment form. Please refresh and try again.");
      }
    };

    const existingScript = document.getElementById("square-js");
    if (existingScript) {
      initializeSquare();
    } else {
      const script = document.createElement("script");
      script.id = "square-js";
      script.src = scriptUrl;
      script.onload = () => initializeSquare();
      document.body.appendChild(script);
    }

    return () => {
      if (cardRef.current) {
        cardRef.current.destroy();
        cardRef.current = null;
      }
    };
  }, [formStep, paymentSuccess, paymentMethod]);

  // ── Send confirmation email (card) ────────────────────────────────────────
  const sendEmail = async () => {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Sponsor Confirmation — ${sponsor?.tierName} — SMG Cares`,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: `Sponsor: ${sponsor?.tierName}\nAmount: ${sponsor?.price}\nPayment Method: Credit Card`,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Email failed");
  };

  // ── Send check instructions email ─────────────────────────────────────────
  const sendCheckEmail = async () => {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Check Reservation — ${sponsor?.tierName} — SMG Cares`,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: `
Sponsorship: ${sponsor?.tierName}
Amount: ${sponsor?.price}
Payment Method: Check
Status: Pending

Please mail check payable to SMG CARES INC.
300 CORPORATE PLAZA, ISLANDIA, NY 11749
within 10 calendar days.
        `.trim(),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Email failed");
  };

  // ── Card payment handler ──────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!card) return;
    setPaymentLoading(true);
    setPaymentError(null);

    // Live availability check
    if (sponsor?.id && sponsor?.maxLimit && sponsor.maxLimit !== -1) {
      try {
        const docRef = doc(db, "sponsorships", sponsor.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const d = docSnap.data();
          const remaining = (d.maxLimit ?? sponsor.maxLimit) - (d.soldCount ?? 0) - (d.reservedCount ?? 0);
          if (remaining <= 0) {
            setPaymentError("Sorry, this sponsorship has just sold out!");
            toast.error("This sponsorship has just sold out!");
            setPaymentLoading(false);
            return;
          }
        }
      } catch (e: any) {
        console.warn("Failed checking live availability:", e.message);
      }
    }

    try {
      const result = await card.tokenize();
      if (result.status === "OK") {
        const amountInCents = Math.round(total * 100);
        const API_URL = import.meta.env.DEV ? "/api/payments/square" : "https://smgcarecharity.vercel.app/api/payments";
        const resp = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: result.token,
            amount: amountInCents,
            registrantEmail: formData.email,
            buyerName: formData.name,
            packageName: sponsor?.tierName,
            sponsorId: sponsor?.id,
          }),
        });
        const text = await resp.text();
        let data: any = {};
        try { data = JSON.parse(text); } catch { console.error("Non-JSON resp", text.slice(0, 300)); }
        if (resp.ok && data.success) {
          // ── Log purchase to Firestore ──
          try {
            await addDoc(collection(db, "purchases"), {
              timestamp: new Date().toISOString(),
              buyerName: formData.name || "Unknown",
              buyerEmail: formData.email || "Unknown",
              packageName: sponsor?.tierName || "Unknown",
              amount: total,
              paymentStatus: "success",
              failureReason: null,
              squarePaymentId: data.payment?.id ?? null,
              source: "SponsorDialog",
            });
          } catch (logErr: any) {
            console.error("Failed logging purchase to Firestore:", logErr.message);
          }
          // Update soldCount in Firestore
          if (sponsor?.id) {
            try {
              const docRef = doc(db, "sponsorships", sponsor.id);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                await updateDoc(docRef, { soldCount: increment(1) });
              } else {
                await setDoc(docRef, { soldCount: 1, reservedCount: 0, maxLimit: sponsor.maxLimit ?? 1 });
              }
            } catch (fsErr: any) {
              console.error("Failed updating soldCount in Firestore:", fsErr.message);
            }
          }
          try { await sendEmail(); } catch (e: any) { console.warn("Email send failed", e); }
          setPaymentSuccess(true);
        } else {
          // ── Log failed payment to Firestore ──
          try {
            await addDoc(collection(db, "purchases"), {
              timestamp: new Date().toISOString(),
              buyerName: formData.name || "Unknown",
              buyerEmail: formData.email || "Unknown",
              packageName: sponsor?.tierName || "Unknown",
              amount: total,
              paymentStatus: "failed",
              failureReason: data.error || `HTTP ${resp.status}`,
              squarePaymentId: null,
              source: "SponsorDialog",
            });
          } catch (logErr: any) {
            console.error("Failed logging failed purchase to Firestore:", logErr.message);
          }
          setPaymentError(data.error || `Payment failed (${resp.status})`);
        }
      } else {
        setPaymentError(result.errors?.[0]?.message || "Tokenization failed");
      }
    } catch (e: any) {
      setPaymentError(e.message || "Unexpected error");
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Check reservation handler ─────────────────────────────────────────────
  const handleCheckSubmit = async () => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      // 1. Live availability check
      if (sponsor?.id && sponsor?.maxLimit && sponsor.maxLimit !== -1) {
        const docSnap = await getDoc(doc(db, "sponsorships", sponsor.id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const remaining = (data.maxLimit ?? sponsor.maxLimit) - (data.soldCount ?? 0) - (data.reservedCount ?? 0);
          if (remaining <= 0) {
            setPaymentError("Sorry, this sponsorship has just sold out!");
            toast.error("This sponsorship is sold out!");
            setPaymentLoading(false);
            return;
          }
        }
      }

      // 2. Calculate expiresAt (10 calendar days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10);

      // 3. Save to checkReservations collection
      await addDoc(collection(db, "checkReservations"), {
        timestamp: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        buyerName: formData.name,
        buyerEmail: formData.email,
        packageName: sponsor?.tierName,
        sponsorshipId: sponsor?.id,
        amount: parseInt((sponsor?.price || "$0").replace(/[^0-9]/g, "")),
        status: "pending",
        paymentMethod: "check",
      });

      // 4. Increment reservedCount in Firestore
      if (sponsor?.id) {
        const docRef = doc(db, "sponsorships", sponsor.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, { reservedCount: increment(1) });
        } else {
          await setDoc(docRef, {
            soldCount: 0,
            reservedCount: 1,
            maxLimit: sponsor.maxLimit ?? 1,
          });
        }
      }

      // 5. Send email with check instructions
      await sendCheckEmail();

      // 6. Show success
      setPaymentSuccess(true);
    } catch (e: any) {
      console.error("Check submit error:", e);
      setPaymentError(e.message || "Something went wrong. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#fdfdfd] border-white/20 p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* ── Header — fixed ─────────────────────────────────────────────── */}
        <div className="bg-primary/5 p-6 border-b border-primary/10 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">
              {paymentSuccess
                ? (paymentMethod === "check" ? "Reservation Pending!" : "Sponsor Complete")
                : formStep === 1
                  ? "Contact Information"
                  : "Secure Payment"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {paymentSuccess
                ? ""
                : formStep === 1
                  ? "Please provide your billing info."
                  : `${sponsor?.tierName} — ${sponsor?.price}`}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Content — scrollable ────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* ── Step 1: Contact form ──────────────────────────────────────── */}
          {formStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="Jane Smith"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="jane@company.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="(555) 000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="123 Main St, City, NY"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Payment ───────────────────────────────────────────── */}
          {formStep === 2 && !paymentSuccess && (
            <div className="space-y-5">
              {/* Sponsorship summary */}
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <p className="text-sm text-muted-foreground font-semibold mb-1">Sponsorship Selected:</p>
                <p className="text-2xl font-display text-primary">{sponsor?.price}</p>
                <p className="text-sm font-medium mt-0.5 text-muted-foreground">{sponsor?.tierName}</p>
              </div>

              {/* Payment method selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPaymentMethod("card");
                    setPaymentError(null);
                  }}
                  className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                    paymentMethod === "card"
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  }`}
                >
                  💳 Credit Card
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod("check");
                    setPaymentError(null);
                  }}
                  className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                    paymentMethod === "check"
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  }`}
                >
                  🏦 Pay by Check
                </button>
              </div>

              {/* ── Credit Card: fee breakdown + Square form ─────────────── */}
              {paymentMethod === "card" && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Base Amount</span>
                      <span>${baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Processing Fee (2.75%)</span>
                      <span>+${fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-foreground border-t pt-1 mt-1">
                      <span>Total Charged</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div id="square-card-container-sponsor" className="min-h-[80px]" />
                </>
              )}

              {/* ── Check: instructions box ───────────────────────────────── */}
              {paymentMethod === "check" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900 space-y-3">
                  <p className="font-bold text-base">Check Payment Instructions</p>
                  <p>
                    All check payments must be received within <strong>10 calendar days</strong> of the online
                    purchase date in order to reserve and hold the selected sponsorship.
                  </p>
                  <p>
                    Sponsorships purchased within <strong>five (5) business days</strong> of the event must be
                    paid by credit card, as check payments will not be accepted during that period.
                  </p>
                  <p>
                    Please include your <strong>name and the sponsorship purchased</strong> in the check memo
                    to ensure proper processing.
                  </p>
                  <div className="bg-white border border-amber-200 rounded-lg p-4 font-medium">
                    <p className="font-black mb-1">Make checks payable to:</p>
                    <p>SMG CARES INC.</p>
                    <p>300 CORPORATE PLAZA</p>
                    <p>ISLANDIA, NY 11749</p>
                  </div>
                </div>
              )}

              {/* Error display */}
              {paymentError && (
                <div className="text-red-500 text-sm font-medium p-3 bg-red-50 rounded-md border border-red-100">
                  {paymentError}
                </div>
              )}
            </div>
          )}

          {/* ── Success screen ────────────────────────────────────────────── */}
          {paymentSuccess && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-display text-primary">
                {paymentMethod === "check" ? "Reservation Pending!" : "Thank you!"}
              </h3>
              <p className="text-muted-foreground max-w-sm">
                {paymentMethod === "check"
                  ? `Your spot for ${sponsor?.tierName} is reserved. Please mail your check payable to SMG CARES INC., 300 Corporate Plaza, Islandia, NY 11749 within 10 calendar days to confirm.`
                  : `Your sponsorship for ${sponsor?.tierName} has been received. A confirmation email will be sent to ${formData.email}.`}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer — fixed ─────────────────────────────────────────────── */}
        <div className="p-4 bg-muted/50 border-t flex justify-between flex-shrink-0">
          {paymentSuccess ? (
            <div className="w-full flex justify-center">
              <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto bg-primary">
                Close
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={paymentLoading}>
                Cancel
              </Button>

              {formStep < 2 ? (
                <Button
                  onClick={() => {
                    if (!formData.name || !formData.email) return toast.error("Name and email required");
                    setFormStep(2);
                  }}
                  className="bg-primary text-primary-foreground"
                >
                  Next
                </Button>
              ) : paymentMethod === "card" ? (
                <Button
                  onClick={handlePayment}
                  disabled={paymentLoading || !card}
                  className="bg-gradient-gold text-accent-foreground"
                >
                  {paymentLoading ? "Processing..." : `Pay $${total.toFixed(2)}`}
                </Button>
              ) : (
                <Button
                  onClick={handleCheckSubmit}
                  disabled={paymentLoading}
                  className="bg-primary text-primary-foreground"
                >
                  {paymentLoading ? "Submitting..." : "Reserve with Check"}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SponsorDialog;
