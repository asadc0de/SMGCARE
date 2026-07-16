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
import { Check, CreditCard, Mail } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, getDocs, getDoc, updateDoc,
  deleteDoc, doc, query, orderBy, where, setDoc, increment
} from "firebase/firestore";

const WEB3FORMS_ACCESS_KEY = "a3cdab0e-c130-42ed-a2f3-107436af5a8a";
const CARD_FEE_RATE = 0.0275;

function calcFee(baseAmountDollars: number) {
  const fee = baseAmountDollars * CARD_FEE_RATE;
  const total = baseAmountDollars + fee;
  return { fee: parseFloat(fee.toFixed(2)), total: parseFloat(total.toFixed(2)) };
}

export function CustomDonationModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void; }) {
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", amount: "" });
  const [amountError, setAmountError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "check">("card");
  const [cardReady, setCardReady] = useState(false);
  const cloverRef = useRef<any>(null);
  const cardElementsRef = useRef<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormStep(1);
      setPaymentSuccess(false);
      setPaymentError(null);
      setAmountError("");
      setPaymentMethod("card");
      setFormData({ name: "", email: "", phone: "", address: "", amount: "" });
      cloverRef.current = null;
      cardElementsRef.current = null;
      setCardReady(false);
    }
  }, [open]);

  // Only init Clover when card method is selected on step 2
  useEffect(() => {
    if (formStep === 2 && paymentMethod === "card" && !paymentSuccess) {
      if (cardElementsRef.current) return;

      const publicToken = import.meta.env.VITE_CLOVER_PUBLIC_TOKEN;
      const merchantId = import.meta.env.VITE_CLOVER_MERCHANT_ID;
      const isSandbox = import.meta.env.VITE_CLOVER_ENV !== "production";

      if (!publicToken || !merchantId) {
        setPaymentError("Clover Payment is not configured. Please define VITE_CLOVER_PUBLIC_TOKEN and VITE_CLOVER_MERCHANT_ID in your .env file.");
        return;
      }

      const scriptUrl = isSandbox
        ? "https://checkout.sandbox.dev.clover.com/sdk.js"
        : "https://checkout.clover.com/sdk.js";

      const initializeClover = () => {
        try {
          if (!(window as any).Clover) return;
          const clover = new (window as any).Clover(publicToken, { merchantId });
          const elements = clover.elements();

          const cloverStyles = {
            base: {
              color: '#0f172a',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              '::placeholder': {
                color: '#94a3b8'
              }
            }
          };

          const cardNumber = elements.create('CARD_NUMBER', cloverStyles);
          const cardDate = elements.create('CARD_DATE', cloverStyles);
          const cardCvv = elements.create('CARD_CVV', cloverStyles);
          const cardPostalCode = elements.create('CARD_POSTAL_CODE', cloverStyles);

          if (!document.getElementById('clover-card-number-donation')) return;

          cardNumber.mount('#clover-card-number-donation');
          cardDate.mount('#clover-card-date-donation');
          cardCvv.mount('#clover-card-cvv-donation');
          cardPostalCode.mount('#clover-card-postal-code-donation');

          cloverRef.current = clover;
          cardElementsRef.current = { cardNumber, cardDate, cardCvv, cardPostalCode };
          setCardReady(true);
        } catch (e: any) {
          setPaymentError(e.message || "Failed to initialize payment form.");
        }
      };

      const existingScript = document.getElementById('clover-js');
      if (existingScript) {
        initializeClover();
      } else {
        const script = document.createElement("script");
        script.id = 'clover-js';
        script.src = scriptUrl;
        script.onload = () => initializeClover();
        document.body.appendChild(script);
      }

      return () => {
        cloverRef.current = null;
        cardElementsRef.current = null;
        setCardReady(false);
      };
    }
  }, [formStep, paymentMethod, paymentSuccess]);

  useEffect(() => {
    if (paymentSuccess) {
      // Clover's iframe SDK doesn't expose an unmount/destroy method, and can
      // leave its injected footer/branding elements in the DOM after our
      // container unmounts. Manually sweep them out once payment succeeds.
      document.querySelectorAll('.clover-footer').forEach((el) => el.remove());
      // Also remove any now-orphaned Clover iframe elements that may not have
      // been cleaned up by React unmounting their parent container.
      document.querySelectorAll('iframe[src*="clover.com"]').forEach((el) => el.remove());
    }
  }, [paymentSuccess]);

  const sendEmail = async (method: "card" | "check") => {
    const baseAmount = parseFloat(formData.amount);
    const { fee, total } = calcFee(baseAmount);
    const amountLine = method === "card"
      ? `Amount Charged: $${total.toFixed(2)} (includes 2.75% processing fee of $${fee.toFixed(2)})`
      : `Amount Due: $${baseAmount.toFixed(2)}`;

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "Custom Donation - SMG Cares",
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: [
          "Type: Custom Donation",
          `Payment Method: ${method === "card" ? "Credit Card" : "Check"}`,
          amountLine,
          method === "check" ? "Check payable to: SMG CARES INC.\nMail to: 300 Corporate Plaza, Islandia, NY 11749" : "",
        ].filter(Boolean).join("\n"),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Email failed");
  };

  const handleCardPayment = async () => {
    if (!cardReady || !cloverRef.current) return;
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const result = await cloverRef.current.createToken();
      if (!result.errors && result.token) {
        const baseAmount = parseFloat(formData.amount);
        const { total } = calcFee(baseAmount);
        const totalCents = Math.round(total * 100);

        const API_URL = import.meta.env.DEV ? "/api/payments/clover" : "https://smgcarecharity.vercel.app/api/payments/clover";
        const resp = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: result.token,
            amount: totalCents,
            registrantEmail: formData.email,
            buyerName: formData.name,
            packageName: "Custom Donation",
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
              packageName: "Custom Donation",
              amount: total,
              paymentStatus: "success",
              failureReason: null,
              squarePaymentId: data.payment?.id ?? null,
              source: "CustomDonationModal",
            });
          } catch (logErr: any) {
            console.error("Failed logging purchase to Firestore:", logErr.message);
          }
          try { await sendEmail("card"); } catch (e: any) { console.warn("Email failed", e); }
          setPaymentSuccess(true);
        } else {
          // ── Log failed payment to Firestore ──
          try {
            await addDoc(collection(db, "purchases"), {
              timestamp: new Date().toISOString(),
              buyerName: formData.name || "Unknown",
              buyerEmail: formData.email || "Unknown",
              packageName: "Custom Donation",
              amount: total,
              paymentStatus: "failed",
              failureReason: data.error || `HTTP ${resp.status}`,
              squarePaymentId: null,
              source: "CustomDonationModal",
            });
          } catch (logErr: any) {
            console.error("Failed logging failed purchase to Firestore:", logErr.message);
          }
          setPaymentError(data.error || `Payment failed (${resp.status})`);
        }
      } else {
        const firstError = result.errors ? Object.values(result.errors)[0] : "Card validation failed.";
        setPaymentError(String(firstError) || "Card validation failed. Please check your details.");
      }
    } catch (e: any) {
      setPaymentError(e.message || "Unexpected error");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCheckSubmit = async () => {
    setPaymentLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10);

      await addDoc(collection(db, "checkReservations"), {
        timestamp: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        buyerName: formData.name,
        buyerEmail: formData.email,
        packageName: "Donation",
        sponsorshipId: "donation",
        amount: parseFloat(formData.amount) || 0,
        status: "pending",
        paymentMethod: "check",
      });

      await sendEmail("check");
      setPaymentSuccess(true);
    } catch (e: any) {
      console.error("Check submission failed:", e);
      toast.error("Could not send confirmation email. Please contact us directly.");
      setPaymentSuccess(true); // still mark success, submission is recorded
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!paymentMethod) { toast.error("Please select a payment method."); return; }
    if (paymentMethod === "card") handleCardPayment();
    else handleCheckSubmit();
  };

  const validateAndProceed = () => {
    setAmountError("");
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount < 10) { setAmountError("Minimum donation is $10"); return; }
    if (!formData.name || !formData.email) { toast.error("Name and email required"); return; }
    setFormStep(2);
  };

  const baseAmount = parseFloat(formData.amount) || 0;
  const { fee, total } = calcFee(baseAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#fdfdfd] border-white/20 p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="bg-primary/5 p-6 border-b border-primary/10 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">
              {paymentSuccess ? "Donation Complete" : "Donate to SMG Cares"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {paymentSuccess ? "" : formStep === 1 ? "Every dollar makes a difference." : "Select your payment method."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1 — Contact + Amount */}
          {formStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Donation Amount ($) *</Label>
                <Input
                  type="number"
                  min="10"
                  placeholder="Enter amount (min. $10)"
                  value={formData.amount}
                  onChange={e => {
                    setFormData({ ...formData, amount: e.target.value });
                    if (amountError && parseFloat(e.target.value) >= 10) setAmountError("");
                  }}
                />
                {amountError && <p className="text-red-500 text-sm font-medium">{amountError}</p>}
              </div>
              <div className="space-y-2 mt-4">
                <Label>Full Name *</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </div>
          )}

          {/* STEP 2 — Payment Method */}
          {formStep === 2 && !paymentSuccess && (
            <div className="space-y-5">
              {/* Method selector */}
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Select Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setPaymentMethod("card"); setPaymentError(null); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/40 bg-white"
                    }`}
                  >
                    <CreditCard className={`w-6 h-6 ${paymentMethod === "card" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-black uppercase tracking-wide ${paymentMethod === "card" ? "text-primary" : "text-muted-foreground"}`}>Credit Card</span>
                  </button>
                  <button
                    onClick={() => { setPaymentMethod("check"); setPaymentError(null); cloverRef.current = null; cardElementsRef.current = null; setCardReady(false); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      paymentMethod === "check"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/40 bg-white"
                    }`}
                  >
                    <Mail className={`w-6 h-6 ${paymentMethod === "check" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-black uppercase tracking-wide ${paymentMethod === "check" ? "text-primary" : "text-muted-foreground"}`}>Pay by Check</span>
                  </button>
                </div>
              </div>

              {/* Credit Card UI */}
              {paymentMethod === "card" && (
                <div className="space-y-4">
                  {/* Fee breakdown */}
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-1.5">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Base Amount:</span>
                      <span>${baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-amber-700 font-medium">
                      <span>Processing Fee (2.75%):</span>
                      <span>+${fee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-primary/10 my-1" />
                    <div className="flex justify-between text-base font-black text-primary">
                      <span>Total Charged:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Card form panel */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {/* Header strip */}
                    <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                        </svg>
                        Secure Card Entry
                      </span>
                      <div className="flex items-center gap-1 opacity-70">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-3.5 object-contain" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-3.5 object-contain" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" className="h-3.5 object-contain" />
                      </div>
                    </div>

                    {/* Integrated stripe-style inputs */}
                    <div className="divide-y divide-slate-200">
                      {/* Card Number Container */}
                      <div className="px-3.5 py-2.5 bg-white">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Card Number</label>
                        <div
                          id="clover-card-number-donation"
                          style={{ height: "24px" }}
                          className="w-full overflow-hidden"
                        />
                      </div>

                      {/* Expiry, CVV, ZIP row */}
                      <div className="grid grid-cols-3 divide-x divide-slate-200 bg-white">
                        <div className="px-3.5 py-2.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expiry</label>
                          <div
                            id="clover-card-date-donation"
                            style={{ height: "24px" }}
                            className="w-full overflow-hidden"
                          />
                        </div>
                        <div className="px-3.5 py-2.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVV</label>
                          <div
                            id="clover-card-cvv-donation"
                            style={{ height: "24px" }}
                            className="w-full overflow-hidden"
                          />
                        </div>
                        <div className="px-3.5 py-2.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ZIP</label>
                          <div
                            id="clover-card-postal-code-donation"
                            style={{ height: "24px" }}
                            className="w-full overflow-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="flex items-start gap-2 text-red-600 text-sm font-medium p-3 bg-red-50 rounded-xl border border-red-200">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                      {paymentError}
                    </div>
                  )}
                </div>
              )}

              {/* Check UI */}
              {paymentMethod === "check" && (
                <div className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="text-sm text-muted-foreground font-semibold mb-1">Amount Due</p>
                    <p className="text-3xl font-display text-primary">${baseAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">No processing fee for check payments</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3 text-sm text-blue-900">
                    <p className="font-black uppercase tracking-wide text-blue-800 text-xs">Pay by Check — Instructions</p>
                    <p className="text-xs font-semibold leading-relaxed">
                      All check payments must be received within 10 calendar days of the online purchase date in order to reserve and hold the selected sponsorship.
                      Sponsorships purchased within five (5) business days of the event must be paid by credit card, as check payments will not be accepted during that period.
                      Please include your name and the sponsorship purchased in the check memo to ensure proper processing.
                    </p>
                    <div className="border-t border-blue-200 pt-3 space-y-1">
                      <p className="font-bold">Please make checks payable to SMG CARES INC. and mail them to:</p>
                      <p className="font-black text-blue-900">SMG CARES INC.</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold">Mail to:</p>
                      <p className="font-semibold leading-relaxed">
                        SMG CARES INC.<br />
                        300 CORPORATE PLAZA<br />
                        ISLANDIA, NY 11749
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUCCESS */}
          {paymentSuccess && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-display text-primary">
                {paymentMethod === "check" ? "Reservation Pending!" : "Thank you!"}
              </h3>
              {paymentMethod === "check" ? (
                <p className="text-muted-foreground max-w-sm">
                  Please mail your check payable to <strong>SMG CARES INC.</strong>, 300 Plaza, Islandia, NY 11749 within <strong>10 calendar days</strong> to confirm your spot.
                </p>
              ) : (
                <p className="text-muted-foreground max-w-sm">
                  Your generous donation of <strong>${total.toFixed(2)}</strong> has been received. A confirmation email will be sent to {formData.email}.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/50 border-t flex justify-between flex-shrink-0">
          {paymentSuccess ? (
            <div className="w-full flex justify-center">
              <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto bg-primary">
                {paymentMethod === "check" ? "Done" : "Close"}
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={() => { if (formStep === 2) setFormStep(1); else onOpenChange(false); }} disabled={paymentLoading}>
                {formStep === 2 ? "Back" : "Cancel"}
              </Button>
              {formStep < 2 ? (
                <Button onClick={validateAndProceed} className="bg-primary text-primary-foreground">Next</Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={paymentLoading || (paymentMethod === "card" && !cardReady) || !paymentMethod}
                  className="bg-gradient-gold text-accent-foreground font-bold hover:scale-105 transition-transform"
                >
                  {paymentLoading ? (
                    <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-foreground" /> Processing...</span>
                  ) : paymentMethod === "check" ? "Confirm & Submit" : "Donate Now"}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CustomDonationModal;
