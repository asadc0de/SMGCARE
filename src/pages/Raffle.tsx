import { useState, useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CustomDonationModal } from "@/components/CustomDonationModal";
import { RafflePaymentDialog } from "@/components/RafflePaymentDialog";
import { Gift, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Ticket, ExternalLink, RefreshCw, Heart, Eye, Coffee, Flag, Utensils, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

// Import generated assets
import raffleHeroBg from "@/assets/raffle-hero-bg.png";
import raffleRolex from "@/assets/image copy.png";
import raffleNecklace from "@/assets/image.png";

// ── CONFIGURABLE CONSTANTS ───────────────────────────────────────────────────
// Board Size & Pricing Configuration
const BOARD_SIZE = 144; // Number of available box numbers (1 through 144 - 12x12 grid)
const TICKET_PRICE = 200; // Fixed base price per box number in USD ($200 + 2.75% processing fee)

// Sponsor Block Configuration
const RAFFLE_SPONSOR = {
  name: "Elegant Jewelers of Woodbury",
  tagline: "", // client didn't provide a tagline
  address: "", // client didn't provide an address
  websiteUrl: "https://elegantjewelersny.com",
  buttonText: "Visit Their Website",
};

// Featured Display-Only Prizes
interface FeaturedPrize {
  id: number;
  title: string;
  shortDescription: string;
  description: string;
  image: string;
  specs: string[] | null;
}

const FEATURED_PRIZES: FeaturedPrize[] = [
  {
    id: 1,
    title: "Win a Rolex Sky-Dweller",
    shortDescription: "One of Rolex's most iconic timepieces — a 42 mm Sky-Dweller in White Rolesor with a bright blue dial and Oyster bracelet.",
    description: "You could take home one of Rolex's most sophisticated and iconic timepieces, the Rolex Oyster Perpetual Sky-Dweller. This stunning Sky-Dweller features a bright blue dial, 42 mm White Rolesor case combining Oystersteel and 18 ct white gold, Rolex's signature fluted Ring Command bezel, and classic Oyster bracelet. Designed with the world traveler in mind, the Sky-Dweller features dual time zones and Rolex's innovative annual calendar, all powered by Rolex's self-winding movement with approximately 72 hours of power reserve. With its unmistakable blue dial and signature Rolex styling, this is an incredible opportunity to win a truly exceptional luxury timepiece.",
    image: raffleRolex,
    specs: ["Rolex Sky-Dweller Ref. 336934", "Bright Blue Dial", "Oyster Bracelet", "42 mm"],
  },
  {
    id: 2,
    title: "Win a 2.12 Carat Diamond Necklace",
    shortDescription: "A stunning five-diamond necklace featuring 2.12 total carats of fancy-shaped diamonds on a 14K white gold chain.",
    description: "You could win this stunning five-diamond necklace featuring 2.12 total carats of fancy-shaped diamonds set on an elegant 14 karat white gold chain. Featuring five individually set diamonds in a beautiful assortment of shapes, the necklace creates a unique combination of brilliance, dimension and timeless elegance. The mixed diamond cuts form a sophisticated centerpiece that is equally suited for a special occasion or an elevated everyday look. A beautiful piece of fine jewelry and an unforgettable prize to take home from the SMG Cares Golf Outing.",
    image: raffleNecklace,
    specs: ["Five Multi-Shaped Fancy Diamonds", "2.12 Total Carat Weight", "14 Karat White Gold Chain"],
  },
];

const Raffle = () => {
  const [donationOpen, setDonationOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [soldNumbers, setSoldNumbers] = useState<number[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [selectedPrize, setSelectedPrize] = useState<FeaturedPrize | null>(null);

  // ── Real-Time Firestore Synchronization for Sold Numbers ─────────────────
  useEffect(() => {
    const isConfigured =
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_API_KEY !== "YOUR_API_KEY" &&
      import.meta.env.VITE_FIREBASE_API_KEY.trim() !== "";

    if (!isConfigured) {
      setIsLoadingBoard(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "raffle_tickets", "board"),
      (docSnap) => {
        setIsLoadingBoard(false);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const soldArr: number[] = data.soldNumbers || [];
          setSoldNumbers(soldArr);

          // Automatically unselect any number that was just bought by someone else
          setSelectedNumbers((prev) => prev.filter((num) => !soldArr.includes(num)));
        }
      },
      (err) => {
        console.warn("Firestore raffle board snapshot error:", err.message);
        setIsLoadingBoard(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ── Toggle Number Selection & Auto-Scroll ─────────────────────────────────
  const toggleNumberSelection = (num: number) => {
    if (soldNumbers.includes(num)) return; // Sold numbers cannot be selected

    setSelectedNumbers((prev) => {
      const isSelecting = !prev.includes(num);
      const next = isSelecting ? [...prev, num] : prev.filter((n) => n !== num);
      if (isSelecting) {
        setTimeout(() => {
          const el = document.getElementById("raffle-checkout-bar");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 120);
      }
      return next;
    });
  };

  // ── Smooth Scroll Helper ─────────────────────────────────────────────────
  const scrollToBoard = () => {
    const el = document.getElementById("raffle-board");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ── Handle Checkout Trigger with Race Condition Check ──────────────────────
  const handleProceedToCheckout = () => {
    if (selectedNumbers.length === 0) {
      toast.error("Please select at least one available box number to proceed.");
      return;
    }

    // Verify no selected number has become sold
    const conflict = selectedNumbers.filter((n) => soldNumbers.includes(n));
    if (conflict.length > 0) {
      toast.error(
        `Number(s) #${conflict.join(", #")} were just purchased by another visitor. Please choose available numbers.`
      );
      setSelectedNumbers((prev) => prev.filter((n) => !soldNumbers.includes(n)));
      return;
    }

    setPaymentOpen(true);
  };

  return (
    <PageShell>
      {/* ── HERO SECTION: 3 Top-Level Action Buttons ──────────────────────── */}
      <section className="relative min-h-[90svh] lg:min-h-[100svh] flex items-center overflow-hidden bg-primary">
        <div className="absolute inset-0">
          <img src={raffleHeroBg} alt="Raffle Hero Background" className="w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-primary/55" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent" />
        </div>
        <div className="absolute inset-0 floral-pattern opacity-[0.1] mix-blend-overlay" />

        <div className="container-x relative z-10 py-28 md:py-36 mt-16 md:mt-20">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 md:mb-10">
                <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-soft">
                  2026 Annual Outing Raffle
                </span>
              </div>
              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[7rem] leading-[0.9] tracking-tighter mb-8 text-white drop-shadow-2xl">
                The Charity <br />
                <span className="italic text-[#72a8ff]">raffle board.</span>
              </h1>
              <p className="max-w-2xl text-base md:text-xl text-white/80 leading-relaxed font-medium mb-6 drop-shadow-lg">
                Pick your lucky box number(s) on our live raffle board. Every box number selected directly supports SMG Cares and enters you into our grand prize drawings.
              </p>

              {/* Golf Outing Schedule Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-4xl mb-10">
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 flex items-center gap-3 hover:border-white/20 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center text-accent-foreground shrink-0 shadow-gold">
                    <Coffee size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-soft block leading-none mb-1">10:00 AM</span>
                    <p className="text-xs font-bold text-white leading-tight">Participant Registration &amp; Welcome Breakfast</p>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 flex items-center gap-3 hover:border-white/20 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center text-accent-foreground shrink-0 shadow-gold">
                    <Flag size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-soft block leading-none mb-1">12:00 PM</span>
                    <p className="text-xs font-bold text-white leading-tight">Shotgun Start</p>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 flex items-center gap-3 hover:border-white/20 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center text-accent-foreground shrink-0 shadow-gold">
                    <Utensils size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-soft block leading-none mb-1">5:30 PM</span>
                    <p className="text-xs font-bold text-white leading-tight">Cocktails, Dinner &amp; Live Raffle Drawing</p>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 md:gap-5">
                <Button
                  onClick={() => setDonationOpen(true)}
                  size="lg"
                  className="bg-gradient-gold text-accent-foreground rounded-full px-7 md:px-9 h-14 md:h-16 text-base md:text-lg font-black shadow-gold hover:scale-105 transition-transform w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <Heart size={20} />
                  Make a Donation
                </Button>

                <Button
                  onClick={scrollToBoard}
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-7 md:px-9 h-14 md:h-16 text-base md:text-lg font-black transition-transform hover:scale-105 w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <Gift size={20} />
                  Select Box Number
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRIZE SHOWCASE (DISPLAY ONLY — NO BUY BUTTONS PER CARD) ────────── */}
      <section className="container-x py-16 md:py-24 relative">
        <div className="mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-3">
            <Sparkles size={14} className="text-accent" />
            <span className="text-xs uppercase font-bold tracking-widest text-primary">Featured Prizes & Packages</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-primary leading-tight">
            What you can <span className="italic text-[#72a8ff]">win.</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-2xl font-medium">
            Explore our luxury prize showcases below. Winners are drawn live during the 5:30 PM Extended Cocktail Reception, Dinner and Raffle Drawing at the 2026 Charity Golf Outing.
          </p>
        </div>

        {/* Prize Cards — 2 centered cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
          {FEATURED_PRIZES.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              onClick={() => setSelectedPrize(item)}
              className="relative rounded-2xl md:rounded-3xl border border-black/8 flex flex-col overflow-hidden bg-white shadow-soft group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-primary/5">
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <h3 className="font-display text-lg md:text-xl text-white font-bold tracking-tight leading-snug drop-shadow-lg">
                    {item.title}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 md:p-5 flex flex-col gap-3 flex-grow">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium line-clamp-2">
                  {item.shortDescription}
                </p>

                <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1.5 text-xs text-accent font-bold">
                    <Gift size={14} /> Prize Drawing
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-primary/60 font-semibold group-hover:text-accent transition-colors">
                    View Details <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Prize Detail Dialog ──────────────────────────────────────────── */}
        <Dialog open={!!selectedPrize} onOpenChange={(open) => !open && setSelectedPrize(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl md:rounded-3xl border-0 shadow-2xl gap-0">
            {selectedPrize && (
              <div className="flex flex-col md:flex-row">
                {/* Left — Image */}
                <div className="relative w-full md:w-[45%] aspect-[4/3] md:aspect-auto md:min-h-[400px] overflow-hidden shrink-0 bg-primary/5">
                  <img
                    src={selectedPrize.image}
                    alt={selectedPrize.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/30 via-transparent to-transparent" />
                </div>

                {/* Right — Content */}
                <div className="flex-1 p-6 md:p-8 flex flex-col">
                  <DialogHeader className="mb-5">
                    <div className="inline-flex items-center gap-1.5 text-accent text-[10px] uppercase tracking-widest font-black mb-2">
                      <Sparkles size={12} /> Featured Prize
                    </div>
                    <DialogTitle className="font-display text-xl md:text-2xl text-primary leading-tight tracking-tight">
                      {selectedPrize.title}
                    </DialogTitle>
                  </DialogHeader>

                  <DialogDescription asChild>
                    <div className="flex flex-col flex-grow">
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                        {selectedPrize.description}
                      </p>

                      {/* Specs */}
                      {selectedPrize.specs && (
                        <ul className="mt-5 space-y-2">
                          {selectedPrize.specs.map((spec) => (
                            <li key={spec} className="bg-slate-50 rounded-lg px-3.5 py-2 flex items-center gap-2.5 border border-slate-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                              <span className="text-xs md:text-sm text-primary font-semibold">{spec}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-auto pt-5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-semibold">
                        <Gift size={14} className="text-accent shrink-0" />
                        <span>Included in Board Drawing — Winners drawn live at the 2026 Golf Outing Dinner</span>
                      </div>
                    </div>
                  </DialogDescription>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>

      {/* ── NUMBERED BOARD GRID ("BUY A BOARD BOX NUMBER") ──────────────────── */}
      <section id="raffle-board" className="bg-gradient-cream py-16 md:py-28 relative overflow-hidden scroll-mt-24 border-y border-black/5">
        <div className="absolute inset-0 grain pointer-events-none" />
        <div className="container-x relative">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="eyebrow justify-center">Live Number Board</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl text-primary leading-[1.05]">
              Buy a Board <span className="italic text-[#72a8ff]">Box Number.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-base md:text-lg">
              Select one or more available numbers below. Base price: <strong className="text-primary font-bold">${TICKET_PRICE} per box number</strong> (+ 2.75% processing fee on card checkout).
            </p>
          </div>

          {/* Explainer Block & Real-time Notice */}
          <div className="grid md:grid-cols-3 gap-4 mb-10 max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-black/5 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">1</div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Choose Available Box(es)</h4>
                <p className="text-xs text-slate-600 mt-0.5">Click any green box number in the board below to add to your selection.</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-black/5 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm shrink-0">2</div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Checkout & Reserve</h4>
                <p className="text-xs text-slate-600 mt-0.5">Complete payment via Clover credit card or check to lock in your numbers.</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-black/5 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">3</div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Win Prize Drawings</h4>
                <p className="text-xs text-slate-600 mt-0.5">If your box number is drawn at the Golf Outing dinner, you win!</p>
              </div>
            </div>
          </div>

          {/* Board Legend & Real-Time Sync Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-primary/95 text-white p-4 rounded-2xl mb-8 border border-white/10 shadow-lg">
            <div className="flex items-center gap-5 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-emerald-500 border border-emerald-400 shadow-sm" />
                <span>Available (${TICKET_PRICE})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-accent border border-white/40 shadow-sm" />
                <span>Selected ({selectedNumbers.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-slate-900 border border-slate-700 opacity-60" />
                <span>Taken / Sold ({soldNumbers.length})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/80">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-time availability updated live</span>
            </div>
          </div>

          {/* Board Grid Container — 12x12 (144 Boxes) */}
          <div className="relative bg-white/60 backdrop-blur-md p-3 sm:p-6 md:p-8 rounded-[2rem] border border-black/10 shadow-soft">
            {isLoadingBoard ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-accent" />
                <p className="text-sm font-medium">Loading live raffle board...</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1.5 sm:gap-2 md:gap-2.5">
                {Array.from({ length: BOARD_SIZE }, (_, i) => i + 1).map((num) => {
                  const isSold = soldNumbers.includes(num);
                  const isSelected = selectedNumbers.includes(num);

                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={isSold}
                      onClick={() => toggleNumberSelection(num)}
                      className={`relative aspect-square rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm md:text-base flex flex-col items-center justify-center transition-all duration-200 select-none ${
                        isSold
                          ? "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
                          : isSelected
                          ? "bg-[#1C61D1] text-white border-2 border-accent shadow-lg scale-[1.05] z-10"
                          : "bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-800 hover:bg-emerald-500/25 hover:scale-[1.04] shadow-sm cursor-pointer"
                      }`}
                    >
                      <span>#{num}</span>
                      {isSold ? (
                        <span className="text-[7px] sm:text-[8px] uppercase tracking-tighter text-slate-400 leading-none font-bold mt-0.5">SOLD</span>
                      ) : isSelected ? (
                        <CheckCircle2 size={12} className="text-white mt-0.5" />
                      ) : (
                        <span className="text-[7px] sm:text-[8px] tracking-tight text-emerald-700 leading-none font-semibold mt-0.5">${TICKET_PRICE}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky / Floating Selection Summary Bar */}
          {selectedNumbers.length > 0 && (
            <motion.div
              id="raffle-checkout-bar"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-6 mt-8 z-30 max-w-2xl mx-auto bg-primary/95 text-white backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-accent text-accent-foreground text-xs font-black px-2.5 py-0.5 rounded-full">
                    {selectedNumbers.length} {selectedNumbers.length === 1 ? "Box" : "Boxes"} Selected
                  </span>
                  <button
                    onClick={() => setSelectedNumbers([])}
                    className="text-xs text-white/60 hover:text-white underline font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <p className="text-xs text-white/80 mt-1 max-w-xs truncate">
                  Numbers: #{selectedNumbers.slice().sort((a, b) => a - b).join(", #")}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white">
                    Total: <span className="text-accent">${(selectedNumbers.length * TICKET_PRICE).toLocaleString()}</span>
                  </span>
                  <span className="text-[11px] text-white/60 font-medium">
                    (+ 2.75% fee on card)
                  </span>
                </div>
              </div>

              <Button
                onClick={handleProceedToCheckout}
                size="lg"
                className="bg-gradient-gold text-accent-foreground font-black rounded-full px-8 h-12 text-sm uppercase tracking-wider shadow-gold hover:scale-105 transition-transform w-full sm:w-auto shrink-0"
              >
                Proceed to Checkout →
              </Button>
            </motion.div>
          )}

        </div>
      </section>

      {/* ── SPONSOR BLOCK (CONFIGURABLE) ─────────────────────────────────── */}
      <section className="container-x py-16 md:py-24">
        <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] border border-black/10 p-8 sm:p-12 shadow-soft text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest mb-4">
            Official Raffle Sponsor
          </div>
          
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-2">
            Sponsored By <br></br> <span className="italic text-[#72a8ff]">{RAFFLE_SPONSOR.name}</span>
          </h3>
          
          {RAFFLE_SPONSOR.tagline ? (
            <p className="text-sm sm:text-base text-muted-foreground font-medium mb-2">
              {RAFFLE_SPONSOR.tagline}
            </p>
          ) : null}
          
          {RAFFLE_SPONSOR.address ? (
            <p className="text-xs text-slate-500 mb-6">
              {RAFFLE_SPONSOR.address}
            </p>
          ) : null}

          <div className={RAFFLE_SPONSOR.tagline || RAFFLE_SPONSOR.address ? "mt-4" : "mt-6"}>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-primary/20 hover:scale-105 transition-all text-primary font-bold px-8 h-12 text-sm"
            >
              <a href={RAFFLE_SPONSOR.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                {RAFFLE_SPONSOR.buttonText} <ExternalLink size={14} />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section className="container-x pb-16 md:pb-24">
        <div className="relative py-16 md:py-24 bg-primary text-primary-foreground overflow-hidden rounded-[2rem] md:rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--accent)/0.6),transparent_60%)]" />
          <div className="absolute inset-0 floral-pattern opacity-[0.03]" />
          <div className="relative text-center px-6">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
              Support SMG Cares <span className="italic text-[#72a8ff]">Today.</span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-primary-foreground/80 text-base md:text-lg leading-relaxed">
              Every dollar raised from our raffle and outing directly supports local families, employees, and community charities.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Button
                onClick={() => setDonationOpen(true)}
                className="bg-gradient-gold text-accent-foreground rounded-full px-8 h-14 font-black shadow-gold hover:scale-105 transition-transform"
              >
                Make a Donation
              </Button>
              <Button
                onClick={scrollToBoard}
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-full px-8 h-14 font-black transition-all"
              >
                Select Box Number
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Payment and Donation Modals */}
      <CustomDonationModal open={donationOpen} onOpenChange={setDonationOpen} />
      <RafflePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        selectedNumbers={selectedNumbers}
        ticketPrice={TICKET_PRICE}
        onSuccess={() => setSelectedNumbers([])}
      />
    </PageShell>
  );
};

export default Raffle;
