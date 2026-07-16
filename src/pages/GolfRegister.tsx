import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Trophy, Users, Star, Flag, ChevronRight, ChevronLeft, CheckCircle2, XCircle, AlertCircle, Infinity as InfinityIcon, CreditCard, Mail } from "lucide-react";
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, increment, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/ContactDialog";
import CustomDonationModal from "@/components/CustomDonationModal";
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
import golfHero from "@/assets/golf-hero.jpg";
import { buildSponsorshipRows, defaultSponsorships } from "@/lib/sponsorships";

const WEB3FORMS_ACCESS_KEY = "a3cdab0e-c130-42ed-a2f3-107436af5a8a";
const CARD_FEE_RATE = 0.0275;

function calcFee(baseAmountCents: number) {
  const fee = Math.round(baseAmountCents * CARD_FEE_RATE);
  return { fee, total: baseAmountCents + fee };
}

function centsToDisplay(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const registrationPackages = [
  {
    id: "individual",
    title: "Individual Player",
    price: "$725",
    icon: Flag,
    includes: [
      "Single golfer entry",
      "Lunch included",
      "Dinner reception included",
    ],
    numberOfGolferSlots: 1,
  },
  {
    id: "foursome",
    title: "Foursome",
    price: "$2,800",
    icon: Users,
    featured: true,
    includes: [
      "4 golfer entries",
      "Lunch included",
      "Dinner reception included",
      "Hole signage",
    ],
    numberOfGolferSlots: 4,
  },
  {
    id: "cocktail",
    title: "Cocktail Reception Only",
    price: "$250",
    icon: Star,
    includes: [
      "Reception access only",
      "No golf included",
    ],
    numberOfGolferSlots: 0,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as any } },
};

const GolfRegister = () => {
  const [activeTab, setActiveTab] = useState<"register" | "sponsor">("register");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("scroll") === "true") {
      setActiveTab("register");
      const timer = setTimeout(() => {
        const element = document.getElementById("registration-cards");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [visibleSponsorCount, setVisibleSponsorCount] = useState(6);
  const [contact, setContact] = useState(false);
  const [customDonationOpen, setCustomDonationOpen] = useState(false);
  const [registerFormOpen, setRegisterFormOpen] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    golfers: [{ name: "", email: "", phone: "" }, { name: "", email: "", phone: "" }, { name: "", email: "", phone: "" }, { name: "", email: "", phone: "" }],
  });
  const [isDonationOnly, setIsDonationOnly] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "check">("card");
  const [emailNotificationStatus, setEmailNotificationStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [emailNotificationError, setEmailNotificationError] = useState<string | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const cloverRef = useRef<any>(null);
  const cardElementsRef = useRef<any>(null);

  const [packages] = useState<any[]>(registrationPackages);
  const [tiers, setTiers] = useState<any[]>(defaultSponsorships.map((s) => ({
    ...s,
    tier: s.tierName,
    soldCount: 0,
    reservedCount: 0,
    custom: false,
    hidden: false,
  })));

  // ── Real-time Firestore inventory sync ──────────────────────────────────
  useEffect(() => {
    const isConfigured =
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_API_KEY !== "YOUR_API_KEY" &&
      import.meta.env.VITE_FIREBASE_API_KEY.trim() !== "";

    if (!isConfigured) return;

    const unsubscribe = onSnapshot(
      collection(db, "sponsorships"),
      (snap) => {
        const dbData: Record<string, any> = {};
        snap.forEach((d) => { dbData[d.id] = d.data(); });
        setTiers(buildSponsorshipRows(dbData));
      },
      (err) => console.warn("Firestore error (GolfRegister):", err.message)
    );
    return () => unsubscribe();
  }, []);

  const getGolferSlots = () => {
    if (selectedPackage) {
      return packages.find(p => p.id === selectedPackage)?.numberOfGolferSlots || 0;
    }
    if (selectedTier) {
      return tiers.find(t => t.id === selectedTier)?.numberOfGolferSlots || 0;
    }
    return 0;
  };

  const resetRegistrationForm = () => {
    setRegisterFormOpen(false);
    setPaymentSuccess(false);
    setPaymentError(null);
    setEmailNotificationStatus("idle");
    setEmailNotificationError(null);
    setFormStep(1);
    setIsDonationOnly(false);
    setDonationAmount("");
    setPaymentMethod("card");
  };

  const handleRegisterFormOpenChange = (open: boolean) => {
    setRegisterFormOpen(open);

    if (!open) {
      setPaymentSuccess(false);
      setPaymentError(null);
      setEmailNotificationStatus("idle");
      setEmailNotificationError(null);
      setFormStep(1);
      setIsDonationOnly(false);
      setDonationAmount("");
      setPaymentMethod("card");
    } else {
       const slots = getGolferSlots();
       setFormData(prev => {
          const currentGolfers = [...prev.golfers];
          while (currentGolfers.length < slots) {
             currentGolfers.push({ name: "", email: "", phone: "" });
          }
          return { ...prev, golfers: currentGolfers.slice(0, Math.max(slots, 4)) };
       });
    }
  };

  const getSelectionLabel = () => {
    if (isDonationOnly) return "Donation Only";
    if (selectedPackage) {
      return packages.find((pkg) => pkg.id === selectedPackage)?.title || "";
    }

    if (selectedTier) {
      return tiers.find((tier) => tier.id === selectedTier)?.tier || "";
    }

    return "";
  };

  const getSelectionPrice = () => {
    if (isDonationOnly) return `$${donationAmount || "0"}`;
    if (selectedPackage) {
      return packages.find((pkg) => pkg.id === selectedPackage)?.price || "";
    }

    if (selectedTier) {
      return tiers.find((tier) => tier.id === selectedTier)?.price || "";
    }

    return "";
  };

  const getSelectedRecipientType = () => {
    if (isDonationOnly) return "Donation";
    return selectedTier ? "Sponsorship" : "Registration";
  };

  const getGolfersSummary = () => {
    if (isDonationOnly || getGolferSlots() === 0) return "None";
    const golfers = formData.golfers
      .slice(0, getGolferSlots())
      .filter((golfer) => golfer.name.trim() || golfer.email.trim() || (golfer as any).phone?.trim())
      .map((golfer: any, index) => `Participant ${index + 1}: ${golfer.name || "N/A"} | ${golfer.phone || "N/A"} | ${golfer.email || "N/A"}`);

    return golfers.length ? golfers.join("\n") : "None";
  };

  const sendRegistrationEmail = async (method: "card" | "check") => {
    // Compute amounts for email
    const priceStr = getSelectionPrice().replace(/[^0-9.]/g, "");
    const baseAmount = parseFloat(priceStr || "0");
    const fee = baseAmount * 0.0275;
    const total = baseAmount + fee;

    const paymentLine = method === "card"
      ? `Payment Method: Credit Card\nAmount Charged: $${total.toFixed(2)} (includes 2.75% processing fee of $${fee.toFixed(2)})`
      : `Payment Method: Check\nAmount Due: $${baseAmount.toFixed(2)}\nCheck Instructions: All check payments must be received within 10 calendar days of the online purchase date in order to reserve and hold the selected sponsorship. Sponsorships purchased within five (5) business days of the event must be paid by credit card, as check payments will not be accepted during that period. Please include your name and the sponsorship purchased in the check memo to ensure proper processing. Please make checks payable to SMG CARES INC. and mail them to: SMG CARES INC., 300 CORPORATE PLAZA, ISLANDIA, NY 11749`;

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "Thank you for your registration - SMG Cares",
        from_name: "SMG Cares Golf Registration",
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        registration_type: getSelectedRecipientType(),
        package_or_tier: getSelectionLabel(),
        amount: method === "card" ? `$${total.toFixed(2)}` : `$${baseAmount.toFixed(2)}`,
        golfers: getGolfersSummary(),
        message: [
          `Registration Type: ${getSelectedRecipientType()}`,
          `Selection: ${getSelectionLabel()}`,
          paymentLine,
          "",
          "Contact Information",
          `Name: ${formData.name}`,
          `Email: ${formData.email}`,
          `Phone: ${formData.phone || "N/A"}`,
          `Address: ${formData.address || "N/A"}`,
          `City: ${formData.city || "N/A"}`,
          `State: ${formData.state || "N/A"}`,
          `Zip: ${formData.zip || "N/A"}`,
          "",
          "Golfer Details",
          getGolfersSummary(),
        ].join("\n"),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Web3Forms email delivery failed.");
    }
  };

  useEffect(() => {
    if (paymentMethod !== "card") return;
    if (formStep === 3 && !paymentSuccess) {
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

          if (!document.getElementById('clover-card-number')) return;

          cardNumber.mount('#clover-card-number');
          cardDate.mount('#clover-card-date');
          cardCvv.mount('#clover-card-cvv');
          cardPostalCode.mount('#clover-card-postal-code');

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
    }
  }, [paymentMethod, formStep]);

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

  const handleRegisterCTA = () => {
    if (!selectedPackage) {
      toast.error("Please select a registration package first.");
      return;
    }
    const slots = packages.find(p => p.id === selectedPackage)?.numberOfGolferSlots || 0;
    setFormData(prev => {
      const newGolfers = [...prev.golfers];
      while (newGolfers.length < slots) newGolfers.push({ name: "", email: "", phone: "" });
      return { ...prev, golfers: newGolfers.slice(0, Math.max(slots, 4)) };
    });
    setFormStep(1);
    setIsDonationOnly(false);
    setDonationAmount("");
    setRegisterFormOpen(true);
  };

  const handleNextStep = () => {
    if (formStep === 1) {
      if (!formData.name || !formData.email) {
        toast.error("Name and email are required to continue.");
        return;
      }
      if (isDonationOnly) {
        const amt = parseInt((donationAmount || "0").replace(/[^0-9]/g, ""));
        if (amt <= 0 || isNaN(amt)) {
          toast.error("Please enter a valid donation amount.");
          return;
        }
        setFormStep(3);
        return;
      }
      const slots = getGolferSlots();
      if (slots === 0) {
        setFormStep(3);
      } else {
        setFormStep(2);
      }
    } else if (formStep === 2) {
      setFormStep(3);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!cardReady || !cloverRef.current) return;
    setPaymentLoading(true);
    setPaymentError(null);

    // ── Live availability check before payment ──
    if (selectedTier) {
      const tier = tiers.find(t => t.id === selectedTier);
      if (tier && tier.maxLimit && tier.maxLimit !== -1) {
        try {
          const docRef = doc(db, "sponsorships", selectedTier);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const soldCount = data.soldCount ?? 0;
            const reservedCount = data.reservedCount ?? 0;
            const remaining = (data.maxLimit ?? tier.maxLimit) - soldCount - reservedCount;
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
    }

    try {
      const result = await cloverRef.current.createToken();
      if (!result.errors && result.token) {
        let baseAmount = 0;
        let pName = "";

        if (isDonationOnly) {
          baseAmount = parseFloat(donationAmount.replace(/[^0-9.]/g, "")) || 0;
          pName = "Donation Only";
        } else if (selectedPackage) {
          const pkg = packages.find(p => p.id === selectedPackage);
          baseAmount = parseFloat((pkg?.price || "0").replace(/[^0-9.]/g, "")) || 0;
          pName = pkg?.title || "";
        } else if (selectedTier) {
          const tier = tiers.find(t => t.id === selectedTier);
          baseAmount = parseFloat((tier?.price || "0").replace(/[^0-9.]/g, "")) || 0;
          pName = tier?.tier || "";
        }

        // Apply 2.75% credit card processing fee
        const fee = baseAmount * 0.0275;
        const total = baseAmount + fee;
        const totalAmountCents = Math.round(total * 100);

        const API_URL = import.meta.env.DEV ? "/api/payments/clover" : "https://smgcarecharity.vercel.app/api/payments/clover";
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: result.token,
            amount: totalAmountCents,
            registrantEmail: formData.email,
            buyerName: formData.name,
            packageName: pName,
            sponsorId: selectedTier ?? undefined,
            golferDetails: formData.golfers,
          })
        });

        // Read as text first so we can always inspect the body,
        // even if it's not valid JSON (e.g. HTML error page from proxy)
        const rawText = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(rawText);
        } catch {
          console.error(`[Payment] Non-JSON response — HTTP ${response.status}:`, rawText.slice(0, 300));
          if (response.status === 503 || response.status === 502) {
            setPaymentError("API server is not running. Run: npm run dev");
          } else if (response.status === 404) {
            setPaymentError("Payment endpoint not found (404). Check your deployment config.");
          } else {
            setPaymentError(`Payment server error (${response.status}). Please try again.`);
          }
          return;
        }

        if (response.ok && data.success) {
          console.log("[GolfRegister] Transaction successful:", data);

          // ── Log purchase to Firestore ──
          try {
            await addDoc(collection(db, "purchases"), {
              timestamp: new Date().toISOString(),
              buyerName: formData.name || "Unknown",
              buyerEmail: formData.email || "Unknown",
              packageName: pName || "Unknown",
              amount: Math.round(total * 100) / 100,
              paymentStatus: "success",
              failureReason: null,
              squarePaymentId: data.payment?.id ?? null,
              source: "GolfRegister",
            });
          } catch (logErr: any) {
            console.error("Failed logging purchase to Firestore:", logErr.message);
          }

          // ── Update sold count in Firestore ──
          if (selectedTier) {
            try {
              const docRef = doc(db, "sponsorships", selectedTier);
              const docSnap = await getDoc(docRef);
              const tier = tiers.find(t => t.id === selectedTier);
              if (docSnap.exists()) {
                await updateDoc(docRef, { soldCount: increment(1) });
              } else {
                await setDoc(docRef, {
                  soldCount: 1,
                  reservedCount: 0,
                  maxLimit: tier?.maxLimit ?? 1,
                });
              }
            } catch (fsErr: any) {
              console.error("Failed updating soldCount in Firestore:", fsErr.message);
            }
          }

          setEmailNotificationStatus("sending");
          setEmailNotificationError(null);

          try {
            await sendRegistrationEmail("card");
            setEmailNotificationStatus("sent");
          } catch (emailError: any) {
            const errorMessage = emailError?.message || "Payment succeeded, but the confirmation email could not be sent.";
            setEmailNotificationStatus("failed");
            setEmailNotificationError(errorMessage);
            toast.error(errorMessage);
          }

          setPaymentSuccess(true);
        } else {
          console.error("[GolfRegister] Transaction failed:", data.error || response.status);
          // ── Log failed payment to Firestore ──
          try {
            await addDoc(collection(db, "purchases"), {
              timestamp: new Date().toISOString(),
              buyerName: formData.name || "Unknown",
              buyerEmail: formData.email || "Unknown",
              packageName: pName || "Unknown",
              amount: Math.round(total * 100) / 100,
              paymentStatus: "failed",
              failureReason: data.error || `HTTP ${response.status}`,
              squarePaymentId: null,
              source: "GolfRegister",
            });
          } catch (logErr: any) {
            console.error("Failed logging failed purchase to Firestore:", logErr.message);
          }
          setPaymentError(data.error || "Payment failed. Please try again.");
        }
      } else {
        const firstError = result.errors ? Object.values(result.errors)[0] : "Card validation failed.";
        setPaymentError(String(firstError) || "Card validation failed. Please check your details.");
        setPaymentLoading(false);
        return;
      }
    } catch (e: any) {
      console.error("[GolfRegister] Transaction unexpected error:", e);
      setPaymentError(e.message || "An unexpected error occurred");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCheckSubmit = async () => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      // 1. Check live availability
      if (selectedTier) {
        const sponsorDoc = await getDoc(doc(db, "sponsorships", selectedTier));
        if (sponsorDoc.exists()) {
          const data = sponsorDoc.data();
          const available = data.maxLimit - data.soldCount - data.reservedCount;
          if (data.maxLimit !== -1 && available <= 0) {
            toast.error("Sorry, this sponsorship is sold out.");
            setPaymentLoading(false);
            return;
          }
        }
      }

      // 2. Calculate expiresAt (10 calendar days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10);

      // Determine package name, sponsorship ID, and amount
      let packageName = "";
      let sponsorshipId = "";
      let amount = 0;

      if (isDonationOnly) {
        packageName = "Donation";
        sponsorshipId = "donation";
        amount = parseFloat(donationAmount.replace(/[^0-9.]/g, "")) || 0;
      } else if (selectedPackage) {
        const pkg = packages.find(p => p.id === selectedPackage);
        packageName = pkg?.title || "";
        sponsorshipId = selectedPackage;
        amount = parseFloat((pkg?.price || "0").replace(/[^0-9.]/g, "")) || 0;
      } else if (selectedTier) {
        const tier = tiers.find(t => t.id === selectedTier);
        packageName = tier?.tier || "";
        sponsorshipId = selectedTier;
        amount = parseFloat((tier?.price || "0").replace(/[^0-9.]/g, "")) || 0;
      }

      // 3. Save to checkReservations
      await addDoc(collection(db, "checkReservations"), {
        timestamp: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        buyerName: formData.name,
        buyerEmail: formData.email,
        packageName,
        sponsorshipId,
        amount,
        status: "pending",
        paymentMethod: "check",
      });

      // 4. Increment reservedCount
      if (selectedTier) {
        const docRef = doc(db, "sponsorships", selectedTier);
        const docSnap = await getDoc(docRef);
        const tier = tiers.find(t => t.id === selectedTier);
        if (docSnap.exists()) {
          await updateDoc(docRef, {
            reservedCount: increment(1),
          });
        } else {
          await setDoc(docRef, {
            soldCount: 0,
            reservedCount: 1,
            maxLimit: tier?.maxLimit ?? 1,
          });
        }
      }

      // 5. Send email (include check instructions)
      setEmailNotificationStatus("sending");
      try {
        await sendRegistrationEmail("check");
        setEmailNotificationStatus("sent");
      } catch (err: any) {
        console.error("Email failed:", err);
        setEmailNotificationStatus("failed");
        setEmailNotificationError(err.message || "Failed to send confirmation email.");
      }

      // 6. Show success screen
      setPaymentSuccess(true);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFinalSubmit = () => {
    if (!paymentMethod) { toast.error("Please select a payment method."); return; }
    if (paymentMethod === "card") handlePaymentSubmit();
    else handleCheckSubmit();
  };

  const handleSponsorCTA = () => {
    if (!selectedTier) {
      toast.error("Please select a sponsorship tier first.");
      return;
    }
    setSelectedPackage(null);
    const slots = tiers.find(t => t.id === selectedTier)?.numberOfGolferSlots || 0;
    setFormData(prev => {
      const newGolfers = [...prev.golfers];
      while (newGolfers.length < slots) newGolfers.push({ name: "", email: "", phone: "" });
      return { ...prev, golfers: newGolfers.slice(0, Math.max(slots, 4)) };
    });
    setFormStep(1);
    setIsDonationOnly(false);
    setDonationAmount("");
    setRegisterFormOpen(true);
  };

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative min-h-[55svh] flex items-center overflow-hidden bg-primary">
        <div className="absolute inset-0">
          <img src={golfHero} alt="" className="w-full h-full object-cover scale-105 opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent" />
        </div>
        <div className="absolute inset-0 floral-pattern opacity-[0.05] mix-blend-overlay" />

        <div className="container-x relative z-10 py-24 md:py-36 mt-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
              <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-soft">2026 Annual Fundraiser</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.85] tracking-tighter mb-6 text-white">
              2026 Charity Golf Outing<br />
              <span className="italic text-[#72a8ff]">Join Us.</span>
            </h1>
            <p className="text-white/70 text-lg max-w-xl leading-relaxed font-medium">
              Reserve your spot or become a sponsor for our annual outing. All proceeds support charitable organizations in our community.
            </p>
          </motion.div>
        </div>
      </section>

      {/* TAB TOGGLE */}
      <section className="container-x py-16">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Tab Switcher */}
          <motion.div variants={fadeUp} className="flex justify-center mb-14">
            <div className="inline-flex bg-[#f0f2f5] rounded-2xl p-1.5 gap-1">
              {(["register", "sponsor"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-8 py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all duration-300 ${activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-primary"
                    }`}
                >
                  {tab === "register" ? "Register" : "Become a Sponsor"}
                </button>
              ))}
            </div>
          </motion.div>

          {/* REGISTER SECTION */}
          {activeTab === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-12">
                <span className="eyebrow justify-center mx-auto flex">Registration</span>
                <h2 className="mt-4 font-display text-3xl md:text-5xl text-primary leading-[1.05]">
                  Choose your <span className="italic text-[#72a8ff]">package.</span>
                </h2>
                <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
                  Select the option that works best for you or your team. All packages include access to the full day of events.
                </p>
              </div>

              <div id="registration-cards" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {packages.map((pkg, i) => {
                  const isSelected = selectedPackage === pkg.id;
                  let Icon = Flag;
                  if (pkg.id === "foursome") Icon = Users;
                  if (pkg.id === "cocktail") Icon = Star;

                  return (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`relative rounded-3xl p-8 border-2 cursor-pointer transition-all duration-300 hover-lift ${isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-elegant"
                        : pkg.featured
                          ? "bg-[#dcdcdc] border-accent/30 shadow-md"
                          : "bg-[#dcdcdc] border-border hover:border-accent/40"
                        }`}
                    >
                      {pkg.featured && !isSelected && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground text-xs uppercase tracking-[0.2em] font-semibold px-4 py-1 rounded-full">
                          Popular
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${isSelected ? "bg-white/15" : "bg-gradient-gold shadow-gold"}`}>
                        <Icon className={`w-6 h-6 ${isSelected ? "text-white" : "text-accent-foreground"}`} strokeWidth={1.5} />
                      </div>
                      <p className={`text-xs uppercase tracking-[0.25em] font-black mb-2 ${isSelected ? "text-white/60" : "text-accent"}`}>{pkg.title}</p>
                      <div className={`font-display text-5xl leading-none mb-6 ${isSelected ? "text-white" : "text-primary"}`}>{pkg.price}</div>
                      <ul className={`space-y-2.5 text-sm ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                        {pkg.includes?.map((item: string) => (
                          <li key={item} className="flex items-center gap-2">
                            <Check className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-white/60" : "text-accent"}`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row justify-center mt-12 gap-4">
                <Button
                  onClick={handleRegisterCTA}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-gold text-accent-foreground rounded-full px-8 md:px-16 h-14 md:h-16 text-lg md:text-xl font-black shadow-gold hover:scale-105 transition-transform"
                >
                  Reserve Your Spot <ArrowRight className="ml-2 md:ml-3 h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </div>
              <p className="text-center text-muted-foreground text-sm mt-4">
                Questions? Email us at <a href="mailto:info@smgcares.org" className="text-primary font-semibold underline">info@smgcares.org</a>
              </p>
            </motion.div>
          )}

          {/* SPONSOR SECTION */}
          {activeTab === "sponsor" && (
            <motion.div
              key="sponsor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-12">
                <span className="eyebrow justify-center mx-auto flex">Sponsorship</span>
                <h2 className="mt-4 font-display text-3xl md:text-5xl text-primary leading-[1.05]">
                  Become a <span className="italic text-[#72a8ff]">sponsor.</span>
                </h2>
                <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
                  Your organization's support directly funds the causes we champion. Choose the tier that reflects your commitment.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto p-2">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0 }}
                  onClick={() => setCustomDonationOpen(true)}
                  className="relative rounded-3xl border-2 overflow-hidden transition-all duration-300 cursor-pointer hover-lift bg-[#dcdcdc] border-border hover:border-accent/40"
                >
                  <div className="p-7 flex flex-col h-full">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-gradient-gold shadow-gold">
                      <Star className="w-5 h-5 text-accent-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="text-xs uppercase tracking-[0.25em] font-black mb-1 text-accent">Make a Difference</p>
                    <div className="font-display text-4xl leading-none mb-3 text-[#72a8ff]">Custom Donation</div>
                    <div className="flex items-center gap-1.5 text-xs mb-3 pb-3 border-b border-black/10">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-accent" />
                      <span className="font-semibold text-accent">Any amount appreciated</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                      <li className="flex items-center gap-2">
                        <span className="flex-shrink-0 text-accent">→</span>
                        Donate directly to SMG Cares
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex-shrink-0 text-accent">→</span>
                        Custom amount (min $10)
                      </li>
                    </ul>
                  </div>
                </motion.div>
                {tiers.slice(0, visibleSponsorCount).map((s, i) => {
                  const isSelected = selectedTier === s.id;
                  const soldCount = s.soldCount ?? 0;
                  const reservedCount = s.reservedCount ?? 0;
                  const maxLimit: number = s.maxLimit ?? -1;
                  const isUnlimited = maxLimit === -1;
                  const remaining = isUnlimited ? Infinity : maxLimit - soldCount - reservedCount;
                  const isSoldOut = !isUnlimited && remaining <= 0;
                  const isLastOne = !isUnlimited && remaining === 1 && maxLimit > 1;
                  const isLow = !isUnlimited && remaining <= 2 && remaining > 0 && maxLimit > 2;
                  const showFeaturedBadge = s.featured && !isSelected && !isSoldOut && !isLastOne && !isLow;

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      onClick={() => {
                        if (isSoldOut) return;

                        setSelectedTier(s.id);
                        requestAnimationFrame(() => {
                          document.getElementById("sponsor-cta-button")?.scrollIntoView({ behavior: "smooth", block: "center" });
                        });
                      }}
                      className={`relative rounded-3xl border-2 overflow-hidden transition-all duration-300 ${
                        isSoldOut
                          ? "grayscale opacity-55 cursor-not-allowed"
                          : "cursor-pointer hover-lift"
                      } ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-elegant"
                          : s.featured
                            ? "bg-[#dcdcdc] border-accent/30 shadow-md"
                            : "bg-[#dcdcdc] border-border hover:border-accent/40"
                      }`}
                    >
                      {/* Sold-out overlay */}
                      {isSoldOut && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-primary/60 backdrop-blur-[3px] rounded-3xl gap-2">
                          <div className="bg-primary text-primary-foreground text-xs font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full shadow-xl border border-white/10">
                            Sold Out
                          </div>
                          <p className="text-white/80 text-[11px] font-medium">This sponsorship has been claimed</p>
                        </div>
                      )}

                      {/* Urgency / low-stock banner (multi-slot tiers only) */}
                      {isLastOne && !isSoldOut && (
                        <div className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.25em] text-center py-1.5 animate-pulse">
                          ⚡ Last Spot — Act Fast!
                        </div>
                      )}
                      {isLow && !isLastOne && !isSoldOut && (
                        <div className="bg-amber-400/90 text-amber-900 text-[10px] font-black uppercase tracking-[0.2em] text-center py-1.5">
                          ⚠ Limited Availability
                        </div>
                      )}

                      <div className="p-7">
                        {/* Featured badge */}
                        {showFeaturedBadge && (
                          <span className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground text-xs uppercase tracking-[0.2em] font-semibold px-4 py-1 rounded-full z-10">
                            Featured
                          </span>
                        )}
                        {/* Selected checkmark */}
                        {isSelected && (
                          <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}

                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${showFeaturedBadge ? "mt-7" : ""} ${isSelected ? "bg-white/15" : "bg-gradient-gold shadow-gold"}`}>
                          <Trophy className={`w-5 h-5 ${isSelected ? "text-white" : "text-accent-foreground"}`} strokeWidth={1.5} />
                        </div>

                        <p className={`text-xs uppercase tracking-[0.25em] font-black mb-1 ${isSelected ? "text-white/60" : "text-accent"}`}>{s.tier}</p>
                        <div className={`font-display text-4xl leading-none mb-3 ${isSelected ? "text-white" : "text-[#72a8ff]"}`}>{s.price}</div>

                        {/* ── Availability indicator ──────────────────────── */}
                        <div className={`flex items-center gap-1.5 text-xs mb-3 pb-3 border-b ${
                          isSelected ? "border-white/15" : "border-black/10"
                        }`}>
                          {isSoldOut ? (
                            <><XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /><span className="font-black text-red-500 uppercase tracking-wide">Sold Out</span></>
                          ) : isUnlimited ? (
                            <><InfinityIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-white/60" : "text-muted-foreground"}`} /><span className={`font-semibold ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>Unlimited Availability</span></>
                          ) : isLastOne ? (
                            <><AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 animate-pulse" /><span className="font-black text-amber-500 uppercase tracking-wide animate-pulse">Last Spot — Act Fast!</span></>
                          ) : isLow ? (
                            <><AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /><span className="font-bold text-amber-500">Only {remaining} of {maxLimit} left</span></>
                          ) : (
                            <>
                              <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-white/80" : "text-accent"}`} />
                              <span className={`font-semibold ${isSelected ? "text-white/80" : "text-accent"}`}>
                                {maxLimit === 1 ? "Available" : `${remaining} of ${maxLimit} spots available`}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Progress bar for limited multi-slot tiers only */}
                        {!isUnlimited && !isSoldOut && maxLimit > 1 && (
                          <div className={`h-1 rounded-full overflow-hidden mb-4 ${isSelected ? "bg-white/20" : "bg-black/10"}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isLastOne ? "bg-amber-500 animate-pulse" : isLow ? "bg-amber-400" : isSelected ? "bg-white/60" : "bg-accent"
                              }`}
                              style={{ width: `${Math.max(6, (remaining / maxLimit) * 100)}%` }}
                            />
                          </div>
                        )}

                        <ul className={`space-y-2 text-sm ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                          {s.perks?.map((p: string) => (
                            <li key={p} className="flex items-center gap-2">
                              <span className={`flex-shrink-0 ${isSelected ? "text-white/60" : "text-accent"}`}>→</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {visibleSponsorCount < tiers.length && (
                <div className="flex justify-center mt-10">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setVisibleSponsorCount((count) => Math.min(count + 6, tiers.length))}
                    className="rounded-full px-8 md:px-10 h-14 md:h-16 text-base md:text-lg font-black border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    See more
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center mt-12 gap-4">
                <Button
                  id="sponsor-cta-button"
                  onClick={handleSponsorCTA}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-gold text-accent-foreground rounded-full px-8 md:px-16 h-14 md:h-16 text-lg md:text-xl font-black shadow-gold hover:scale-105 transition-transform"
                >
                  Become a Sponsor <ArrowRight className="ml-2 md:ml-3 h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </div>
              <p className="text-center text-muted-foreground text-sm mt-4">
                Questions? Email us at <a href="mailto:info@smgcares.org" className="text-primary font-semibold underline">info@smgcares.org</a>
              </p>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* REGISTRATION FORM DIALOG */}
      <Dialog open={registerFormOpen} onOpenChange={handleRegisterFormOpenChange}>
        <DialogContent className="sm:max-w-[600px] bg-[#fdfdfd] border-white/20 p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="bg-primary/5 p-6 border-b border-primary/10 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary flex items-center gap-2">
                {paymentSuccess ? "Registration Complete" : formStep === 1 ? "Contact Information" : formStep === 2 ? "Golfer Details" : "Secure Payment"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {paymentSuccess ? "" : formStep === 1 ? "Please provide your billing and contact info." : formStep === 2 ? "Please provide the names and emails of your golfers." : "Enter your payment details to complete registration."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {formStep === 1 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input id="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">Zip Code</Label>
                      <Input id="zip" value={formData.zip} onChange={e => setFormData({ ...formData, zip: e.target.value })} className="bg-white" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t mt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="cannotAttend"
                      checked={isDonationOnly}
                      onChange={(e) => setIsDonationOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="cannotAttend" className="font-semibold cursor-pointer">I cannot attend, please accept my donation</Label>
                  </div>
                  {isDonationOnly && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="donationAmount">Donation Amount ($) *</Label>
                      <Input
                        id="donationAmount"
                        type="number"
                        min="1"
                        placeholder="e.g. 100"
                        value={donationAmount}
                        onChange={e => setDonationAmount(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {formStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {getGolferSlots() > 0 && (
                  <div className="space-y-2">
                    <Label className="text-primary font-semibold">Number of Participants</Label>
                    <select 
                      className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData.golfers.length}
                      onChange={(e) => {
                        const count = parseInt(e.target.value);
                        setFormData(prev => {
                          const newGolfers = [...prev.golfers];
                          if (count > newGolfers.length) {
                            while (newGolfers.length < count) newGolfers.push({ name: "", phone: "", email: "" } as any);
                          } else {
                            newGolfers.length = count;
                          }
                          return { ...prev, golfers: newGolfers };
                        });
                      }}
                    >
                      {Array.from({ length: getGolferSlots() }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1} Participant{i > 0 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {formData.golfers.map((golfer: any, i) => (
                    <div key={i} className="space-y-4 p-5 border border-gray-200 rounded-2xl bg-white relative shadow-sm">
                      <div className="flex justify-between items-center">
                        <h4 className="font-display text-primary text-xl font-bold">Participant {i + 1}</h4>
                        {i === 0 && (
                          <div className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              id="sameAsPurchaser"
                              onChange={(e) => {
                                const newGolfers = [...formData.golfers];
                                if (e.target.checked) {
                                  newGolfers[0] = { name: formData.name, phone: formData.phone, email: formData.email } as any;
                                } else {
                                  newGolfers[0] = { name: "", phone: "", email: "" } as any;
                                }
                                setFormData({ ...formData, golfers: newGolfers });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="sameAsPurchaser" className="cursor-pointer font-semibold text-xs text-muted-foreground">Same as purchaser</Label>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-primary font-semibold text-xs uppercase tracking-wide">Full Name *</Label>
                          <Input placeholder="Full Name" value={golfer.name || ""} onChange={e => {
                            const newGolfers = [...formData.golfers];
                            if (!newGolfers[i]) newGolfers[i] = { name: "", phone: "", email: "" } as any;
                            newGolfers[i].name = e.target.value;
                            setFormData({ ...formData, golfers: newGolfers });
                          }} className="rounded-xl bg-[#fafafa] border-gray-200" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-primary font-semibold text-xs uppercase tracking-wide">Contact Number *</Label>
                          <Input placeholder="Phone Number" value={golfer.phone || ""} onChange={e => {
                            const newGolfers = [...formData.golfers];
                            if (!newGolfers[i]) newGolfers[i] = { name: "", phone: "", email: "" } as any;
                            (newGolfers[i] as any).phone = e.target.value;
                            setFormData({ ...formData, golfers: newGolfers });
                          }} className="rounded-xl bg-[#fafafa] border-gray-200" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-primary font-semibold text-xs uppercase tracking-wide">Email (Optional)</Label>
                          <Input type="email" placeholder="Email Address" value={golfer.email || ""} onChange={e => {
                            const newGolfers = [...formData.golfers];
                            if (!newGolfers[i]) newGolfers[i] = { name: "", phone: "", email: "" } as any;
                            newGolfers[i].email = e.target.value;
                            setFormData({ ...formData, golfers: newGolfers });
                          }} className="rounded-xl bg-[#fafafa] border-gray-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {formStep === 3 && !paymentSuccess && (() => {
              const priceStr = getSelectionPrice().replace(/[^0-9.]/g, "");
              const baseAmount = parseFloat(priceStr || "0");
              const fee = baseAmount * 0.0275;
              const total = baseAmount + fee;
              return (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  {/* Payment method selector */}
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
                        onClick={() => {
                          setPaymentMethod("check");
                          setPaymentError(null);
                          cloverRef.current = null;
                          cardElementsRef.current = null;
                          setCardReady(false);
                        }}
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
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{getSelectionLabel()}</p>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Base Amount:</span>
                          <span>${baseAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-amber-700 font-medium">
                          <span>Processing Fee (2.75%):</span>
                          <span>+${fee.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-primary/10 my-1"></div>
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
                              id="clover-card-number"
                              style={{ height: "24px" }}
                              className="w-full overflow-hidden"
                            />
                          </div>

                          {/* Expiry, CVV, ZIP row */}
                          <div className="grid grid-cols-3 divide-x divide-slate-200 bg-white">
                            <div className="px-3.5 py-2.5">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expiry</label>
                              <div
                                id="clover-card-date"
                                style={{ height: "24px" }}
                                className="w-full overflow-hidden"
                              />
                            </div>
                            <div className="px-3.5 py-2.5">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVV</label>
                              <div
                                id="clover-card-cvv"
                                style={{ height: "24px" }}
                                className="w-full overflow-hidden"
                              />
                            </div>
                            <div className="px-3.5 py-2.5">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ZIP</label>
                              <div
                                id="clover-card-postal-code"
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
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{getSelectionLabel()}</p>
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
                </motion.div>
              );
            })()}

            {paymentSuccess && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-display text-primary">
                  {paymentMethod === "check" ? "Reservation Pending!" : "You're registered!"}
                </h3>
                {paymentMethod === "check" ? (
                  <p className="text-muted-foreground max-w-sm">
                    Please mail your check payable to <strong>SMG CARES INC.</strong>, 300 Corporate Plaza, Islandia, NY 11749 within <strong>10 calendar days</strong> to confirm your spot.
                  </p>
                ) : (
                  <p className="text-muted-foreground max-w-sm">
                    {emailNotificationStatus === "sent"
                      ? `Thank you, ${formData.name}. A confirmation email with your payment and registration details has been sent to ${formData.email}. We look forward to seeing you on the course.`
                      : `Thank you, ${formData.name}. Your payment was successful and your registration has been recorded.`}
                  </p>
                )}
                {emailNotificationStatus === "failed" && emailNotificationError && (
                  <p className="text-sm text-red-500 max-w-sm">{emailNotificationError}</p>
                )}
              </motion.div>
            )}
          </div>

          <div className="p-4 bg-muted/50 border-t flex justify-between flex-shrink-0">
            {paymentSuccess ? (
              <div className="w-full flex justify-center">
                <Button onClick={resetRegistrationForm} className="w-full sm:w-auto bg-primary">
                  {paymentMethod === "check" ? "Done" : "Return Home"}
                </Button>
              </div>
            ) : (
              <>
                {formStep > 1 && formStep < 4 ? (
                  <Button variant="outline" onClick={() => {
                    if (formStep === 3 && (selectedPackage === "cocktail" || selectedTier)) {
                      setFormStep(1);
                    } else {
                      setFormStep(formStep - 1);
                    }
                  }} disabled={paymentLoading}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                ) : (
                  <Button variant="outline" onClick={() => setRegisterFormOpen(false)} disabled={paymentLoading}>Cancel</Button>
                )}

                {formStep < 3 ? (
                  <Button onClick={handleNextStep} className="bg-primary text-primary-foreground hover:bg-primary/90">Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                ) : (
                  <Button
                    onClick={handleFinalSubmit}
                    disabled={paymentLoading || !paymentMethod || (paymentMethod === "card" && !cardReady)}
                    className="bg-gradient-gold text-accent-foreground font-bold hover:scale-105 transition-transform flex items-center"
                  >
                    {paymentLoading ? (
                      <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-foreground mr-2"></span> Processing...</span>
                    ) : paymentMethod === "check" ? "Confirm & Submit" : "Pay Now"}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CustomDonationModal open={customDonationOpen} onOpenChange={setCustomDonationOpen} />
      <ContactDialog open={contact} onOpenChange={setContact} />
    </PageShell>
  );
};

export default GolfRegister;
