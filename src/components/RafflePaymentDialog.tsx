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
import { Check, Ticket, ShieldCheck, Loader2, Clock } from "lucide-react";
import { doc, getDoc, setDoc, arrayUnion, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

const WEB3FORMS_ACCESS_KEY = "a3cdab0e-c130-42ed-a2f3-107436af5a8a";

interface RafflePaymentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedNumbers: number[];
  ticketPrice: number;
  onSuccess: () => void;
}

export function RafflePaymentDialog({
  open,
  onOpenChange,
  selectedNumbers,
  ticketPrice,
  onSuccess,
}: RafflePaymentDialogProps) {
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState<"card" | "check">("card");
  const [cardReady, setCardReady] = useState(false);
  const cloverRef = useRef<any>(null);
  const cardElementsRef = useRef<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // ── Fee calculation ───────────────────────────────────────────────────────
  const baseAmount = selectedNumbers.length * ticketPrice;
  const fee = Math.round(baseAmount * 0.0275 * 100) / 100;
  const total = baseAmount + fee;

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setFormStep(1);
      setPaymentMethod("card");
      setPaymentSuccess(false);
      setPaymentError(null);
      cloverRef.current = null;
      cardElementsRef.current = null;
      setCardReady(false);
    }
  }, [open]);

  // ── Clover init — only when on step 2 & card is selected ─────────────────
  useEffect(() => {
    if (formStep !== 2 || paymentSuccess || paymentMethod !== "card") return;
    if (cardElementsRef.current) return;

    const publicToken = import.meta.env.VITE_CLOVER_PUBLIC_TOKEN;
    const merchantId = import.meta.env.VITE_CLOVER_MERCHANT_ID;
    const isSandbox = import.meta.env.VITE_CLOVER_ENV !== "production";

    if (!publicToken || !merchantId) {
      setPaymentError("Clover Payment is not configured. Please check VITE_CLOVER_PUBLIC_TOKEN and VITE_CLOVER_MERCHANT_ID.");
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
            '::placeholder': { color: '#94a3b8' }
          }
        };

        const cardNumber = elements.create('CARD_NUMBER', cloverStyles);
        const cardDate = elements.create('CARD_DATE', cloverStyles);
        const cardCvv = elements.create('CARD_CVV', cloverStyles);
        const cardPostalCode = elements.create('CARD_POSTAL_CODE', cloverStyles);

        if (!document.getElementById('clover-card-number-raffle')) return;

        cardNumber.mount('#clover-card-number-raffle');
        cardDate.mount('#clover-card-date-raffle');
        cardCvv.mount('#clover-card-cvv-raffle');
        cardPostalCode.mount('#clover-card-postal-code-raffle');

        cloverRef.current = clover;
        cardElementsRef.current = { cardNumber, cardDate, cardCvv, cardPostalCode };
        setCardReady(true);
      } catch (e: any) {
        console.error("Clover initialization failed:", e);
        setPaymentError(e.message || "Failed to initialize payment form. Please refresh and try again.");
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
  }, [formStep, paymentSuccess, paymentMethod]);

  useEffect(() => {
    if (paymentSuccess) {
      document.querySelectorAll('.clover-footer').forEach((el) => el.remove());
      document.querySelectorAll('iframe[src*="clover.com"]').forEach((el) => el.remove());
    }
  }, [paymentSuccess]);

  // ── Live availability check helper ────────────────────────────────────────
  const checkLiveAvailability = async (): Promise<boolean> => {
    try {
      const docSnap = await getDoc(doc(db, "raffle_tickets", "board"));
      if (docSnap.exists()) {
        const soldArr: number[] = docSnap.data().soldNumbers || [];
        const conflict = selectedNumbers.filter((num) => soldArr.includes(num));
        if (conflict.length > 0) {
          const msg = `Sorry, box number(s) #${conflict.sort((a, b) => a - b).join(", #")} have already been taken by another visitor!`;
          setPaymentError(msg);
          toast.error(msg);
          return false;
        }
      }
      return true;
    } catch (e: any) {
      console.warn("Live availability check warning:", e);
      return true; // proceed if offline fallback
    }
  };

  // ── Send check confirmation email (mirroring SponsorDialog.tsx) ───────────
  const sendCheckEmail = async () => {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Check Reservation — 2026 Raffle Boxes — SMG Cares`,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: `
Raffle Box Numbers: #${selectedNumbers.slice().sort((a, b) => a - b).join(", #")}
Amount: $${baseAmount.toLocaleString()}
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

  // ── Send card confirmation email ──────────────────────────────────────────
  const sendCardEmail = async (chargeRef: string) => {
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `2026 Raffle Ticket Receipt — SMG Cares`,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: `Raffle Box Numbers: #${selectedNumbers.slice().sort((a, b) => a - b).join(", #")}\nTotal Paid: $${total.toLocaleString()}\nPayment Method: Credit Card (Clover)\nTransaction ID: ${chargeRef}`,
        }),
      });
    } catch (e) {
      console.warn("Web3Forms card email warning:", e);
    }
  };

  // ── Check submit handler (Mirroring SponsorDialog.tsx) ───────────────────
  const handleCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      // 1. Live availability check
      const isAvailable = await checkLiveAvailability();
      if (!isAvailable) {
        setPaymentLoading(false);
        return;
      }

      // 2. Calculate expiresAt (10 calendar days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10);

      // 3. Save to checkReservations collection (matching Admin.tsx expectations)
      await addDoc(collection(db, "checkReservations"), {
        timestamp: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        buyerName: formData.name,
        buyerEmail: formData.email,
        buyerPhone: formData.phone,
        packageName: `2026 Raffle Boxes #${selectedNumbers.slice().sort((a, b) => a - b).join(", #")}`,
        sponsorshipId: "raffle",
        numbers: selectedNumbers,
        amount: baseAmount,
        status: "pending",
        paymentMethod: "check",
      });

      // 4. Mark box numbers as sold/reserved in Firestore board collection
      const boardRef = doc(db, "raffle_tickets", "board");
      await setDoc(
        boardRef,
        {
          soldNumbers: arrayUnion(...selectedNumbers),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 5. Send confirmation email
      await sendCheckEmail();

      // 6. Show success
      setPaymentSuccess(true);
      onSuccess();
      toast.success("Raffle numbers reserved! Please mail check to confirm.");
    } catch (err: any) {
      console.error("Check submit error:", err);
      setPaymentError(err.message || "Failed to submit check reservation. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Card submit handler ──────────────────────────────────────────────────
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!cardReady || !cloverRef.current) {
      setPaymentError("Payment form is loading. Please wait a moment and try again.");
      return;
    }

    setPaymentLoading(true);

    try {
      // 1. Live availability check
      const isAvailable = await checkLiveAvailability();
      if (!isAvailable) {
        setPaymentLoading(false);
        return;
      }

      // 2. Tokenize card
      const result = await cloverRef.current.createToken();

      if (result.errors) {
        const firstErr = Object.values(result.errors)[0] as string;
        setPaymentError(firstErr || "Invalid card details. Please check your card info.");
        setPaymentLoading(false);
        return;
      }

      const token = result.token;
      if (!token) {
        setPaymentError("Unable to tokenize card. Please check details and try again.");
        setPaymentLoading(false);
        return;
      }

      const API_URL = import.meta.env.DEV
        ? "/api/payments/clover"
        : "https://smgcarecharity.vercel.app/api/payments/clover";

      const chargeRes = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          amount: Math.round(total * 100),
          description: `2026 Raffle Tickets: #${selectedNumbers.join(", #")} — SMG Cares`,
          email: formData.email,
          customerName: formData.name,
        }),
      });

      const chargeData = await chargeRes.json();

      if (!chargeRes.ok || !chargeData.success) {
        throw new Error(chargeData.error || chargeData.message || "Payment processing failed. Please verify your card details.");
      }

      const chargeRef = chargeData.chargeId || token;

      // 3. Update real-time board in Firestore
      const boardRef = doc(db, "raffle_tickets", "board");
      await setDoc(
        boardRef,
        {
          soldNumbers: arrayUnion(...selectedNumbers),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 4. Save to raffle_orders
      await addDoc(collection(db, "raffle_orders"), {
        numbers: selectedNumbers,
        buyerName: formData.name,
        buyerEmail: formData.email,
        buyerPhone: formData.phone,
        buyerAddress: formData.address,
        amount: total,
        paymentMethod: "card",
        paymentRef: chargeRef,
        createdAt: new Date().toISOString(),
      });

      // 5. Save to purchases collection (for Admin panel visibility)
      await addDoc(collection(db, "purchases"), {
        timestamp: new Date().toISOString(),
        buyerName: formData.name,
        buyerEmail: formData.email,
        packageName: `2026 Raffle Boxes #${selectedNumbers.slice().sort((a, b) => a - b).join(", #")}`,
        amount: total,
        paymentStatus: "success",
        failureReason: null,
        squarePaymentId: chargeRef,
        source: "Raffle Card Payment",
      });

      // 6. Send confirmation email
      await sendCardEmail(chargeRef);

      setPaymentSuccess(true);
      onSuccess();
      toast.success("Raffle tickets purchased successfully!");
    } catch (err: any) {
      console.error("Clover card submit error:", err);
      setPaymentError(err.message || "An unexpected error occurred processing your payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-primary text-primary-foreground border-white/10 p-6 md:p-8 rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <Ticket className="text-accent" size={24} />
            {paymentSuccess
              ? paymentMethod === "check" ? "Reservation Pending" : "Payment Confirmed!"
              : formStep === 1
              ? "Reserve Raffle Numbers"
              : "Checkout & Payment"}
          </DialogTitle>
          <DialogDescription className="text-white/70 text-sm">
            {paymentSuccess
              ? paymentMethod === "check"
                ? "Your check reservation has been recorded."
                : "Thank you for supporting SMG Cares 2026 Charity Raffle!"
              : formStep === 1
              ? "Provide your contact details to lock in your selected numbers."
              : "Complete payment to finalize your raffle board numbers."}
          </DialogDescription>
        </DialogHeader>

        {/* Selected numbers pill summary */}
        {!paymentSuccess && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-2">
            <p className="text-xs font-black uppercase tracking-wider text-accent-soft mb-1.5">
              Selected Raffle Box Numbers ({selectedNumbers.length})
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {selectedNumbers
                .slice()
                .sort((a, b) => a - b)
                .map((num) => (
                  <span
                    key={num}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-accent text-accent-foreground shadow-sm"
                  >
                    #{num}
                  </span>
                ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center text-sm">
              <span className="text-white/70">Subtotal ({selectedNumbers.length} × ${ticketPrice})</span>
              <span className="font-bold text-white">${baseAmount.toLocaleString()}</span>
            </div>
          </div>
        )}

        {paymentSuccess ? (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            {paymentMethod === "check" ? (
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg">
                <Clock className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg">
                <Check className="w-8 h-8" />
              </div>
            )}

            <h3 className="text-xl font-bold text-white">
              {paymentMethod === "check" ? "Reservation Pending" : "Tickets Purchased!"}
            </h3>

            <p className="text-sm text-white/80 max-w-sm leading-relaxed">
              We've reserved box numbers{" "}
              <strong className="text-accent">
                #{selectedNumbers.slice().sort((a, b) => a - b).join(", #")}
              </strong>{" "}
              for <strong className="text-white">{formData.name}</strong>. A confirmation email has been sent to{" "}
              <span className="text-accent">{formData.email}</span>.
            </p>

            {paymentMethod === "check" && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-xs text-white/80 text-left w-full space-y-2 mt-2">
                <p className="font-bold text-white text-sm">Check Payment Instructions:</p>
                <p>Please mail check payable to: <strong className="text-white">SMG CARES INC.</strong></p>
                <p><strong className="text-white">300 CORPORATE PLAZA, ISLANDIA, NY 11749</strong></p>
                <p className="text-amber-300 font-medium">Please mail within 10 calendar days to guarantee your reservation.</p>
                <p className="text-white/60">Memo: 2026 Raffle Boxes #{selectedNumbers.slice().sort((a, b) => a - b).join(", #")}</p>
              </div>
            )}

            <Button
              onClick={() => onOpenChange(false)}
              className="bg-gradient-gold text-accent-foreground font-black rounded-full px-8 h-12 w-full mt-4 shadow-gold hover:scale-[1.02] transition-transform"
            >
              Done
            </Button>
          </div>
        ) : formStep === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormStep(2);
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-white text-xs font-bold uppercase tracking-wider">Full Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white text-xs font-bold uppercase tracking-wider">Email Address *</Label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-11 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-bold uppercase tracking-wider">Phone Number *</Label>
                <Input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 000-0000"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-bold uppercase tracking-wider">Address / City</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="New York, NY"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-11 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="bg-gradient-gold text-accent-foreground font-black rounded-full px-8 h-12 w-full mt-6 shadow-gold hover:scale-[1.02] transition-transform text-base"
            >
              Continue to Payment →
            </Button>
          </form>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Payment options toggle */}
            <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("card");
                  setPaymentError(null);
                }}
                className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  paymentMethod === "card"
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Credit Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("check");
                  setPaymentError(null);
                }}
                className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  paymentMethod === "check"
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Pay by Check
              </button>
            </div>

            {paymentError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium leading-relaxed">
                {paymentError}
              </div>
            )}

            {paymentMethod === "card" ? (
              <form onSubmit={handleCardSubmit} className="space-y-4">
                <div className="space-y-3 bg-white p-4 rounded-2xl text-slate-900 border border-slate-200">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Card Number</Label>
                    <div id="clover-card-number-raffle" className="h-10 border border-slate-300 rounded-lg px-3 flex items-center bg-slate-50" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Exp Date</Label>
                      <div id="clover-card-date-raffle" className="h-10 border border-slate-300 rounded-lg px-2 flex items-center bg-slate-50" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">CVV</Label>
                      <div id="clover-card-cvv-raffle" className="h-10 border border-slate-300 rounded-lg px-2 flex items-center bg-slate-50" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Zip Code</Label>
                      <div id="clover-card-postal-code-raffle" className="h-10 border border-slate-300 rounded-lg px-2 flex items-center bg-slate-50" />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1 text-white/80">
                  <div className="flex justify-between">
                    <span>Tickets Subtotal</span>
                    <span>${baseAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Card Processing Fee (2.75%)</span>
                    <span>${fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white text-sm pt-1 border-t border-white/10">
                    <span>Total Charge</span>
                    <span className="text-accent">${total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormStep(1)}
                    disabled={paymentLoading}
                    className="bg-white/5 border-white/20 text-white rounded-full px-6 h-12"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={paymentLoading}
                    className="bg-gradient-gold text-accent-foreground font-black rounded-full px-8 h-12 flex-grow shadow-gold hover:scale-[1.02] transition-transform text-base"
                  >
                    {paymentLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                      </span>
                    ) : (
                      `Pay $${total.toLocaleString()} Now`
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCheckSubmit} className="space-y-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-xs text-white/80 space-y-2">
                  <p className="font-bold text-white text-sm flex items-center gap-2">
                    <ShieldCheck className="text-accent" size={18} /> Pay by Check Instructions
                  </p>
                  <p>Selecting check payment will reserve your selected raffle box numbers immediately while your check is processed.</p>
                  <p className="font-semibold text-accent">Total Check Amount: ${baseAmount.toLocaleString()}</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormStep(1)}
                    disabled={paymentLoading}
                    className="bg-white/5 border-white/20 text-white rounded-full px-6 h-12"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={paymentLoading}
                    className="bg-gradient-gold text-accent-foreground font-black rounded-full px-8 h-12 flex-grow shadow-gold hover:scale-[1.02] transition-transform text-base"
                  >
                    {paymentLoading ? "Reserving..." : "Reserve Numbers via Check"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
