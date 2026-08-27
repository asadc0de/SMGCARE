import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Pencil, Trash2, Image as ImageIcon, Save, X, Loader2, Trophy, 
  Infinity as InfinityIcon, CheckCircle, XCircle, Clock, AlertCircle, LogOut, Lock, Eye, EyeOff,
  Ticket, CreditCard, DollarSign, Search, RefreshCw, RotateCcw, Download
} from "lucide-react";
import * as XLSX from "xlsx";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, setDoc, increment, where, arrayRemove } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, firebaseIsConfigured } from "@/lib/firebase";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildSponsorshipRows, defaultSponsorships } from "@/lib/sponsorships";

interface Purchase {
  id: string;
  timestamp: string;
  buyerName: string;
  buyerEmail: string;
  packageName: string;
  amount: number;
  paymentStatus: "success" | "failed";
  failureReason: string | null;
  squarePaymentId: string | null;
  source: string;
}

interface CheckReservation {
  id: string;
  timestamp: string;
  expiresAt: string;
  buyerName: string;
  buyerEmail: string;
  packageName: string;
  sponsorshipId: string;
  numbers?: number[];
  amount: number;
  status: "pending" | "approved" | "rejected" | "expired";
  paymentMethod: "check";
}

interface RaffleItem {
  id: string;
  numbers: number[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  paymentMethod: "card" | "check";
  amount: number;
  status: "approved" | "pending" | "rejected" | "expired";
  timestamp: string;
  expiresAt?: string;
  sourceCollection: "raffle_orders" | "checkReservations";
  rawReservation?: CheckReservation;
}

interface Event {
  id?: string;
  title: string;
  year: string;
  tag: string;
  body: string;
  raised?: string;
  charityPartner?: string;
  location?: string;
  eventDate?: string;
  cta?: string;
  to: string;
  image: string;
  gallery?: string[];
  secondary?: boolean;
  createdAt: any;
}

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<"events" | "sponsorships" | "purchases" | "checkReservations" | "raffle">("events");
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [sponsorshipsLoading, setSponsorshipsLoading] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesFilter, setPurchasesFilter] = useState<"All" | "Success" | "Failed">("All");
  const [purchasesSort, setPurchasesSort] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [savingSponsorId, setSavingSponsorId] = useState<string | null>(null);
  const [mutatingSponsorId, setMutatingSponsorId] = useState<string | null>(null);
  const [editingSponsorship, setEditingSponsorship] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showAddSponsorshipForm, setShowAddSponsorshipForm] = useState(false);
  const [checkReservations, setCheckReservations] = useState<CheckReservation[]>([]);
  const [checkReservationsLoading, setCheckReservationsLoading] = useState(false);
  const [checkReservationsFilter, setCheckReservationsFilter] = useState<"all" | "pending" | "approved" | "rejected" | "expired">("pending");
  const [processingReservationId, setProcessingReservationId] = useState<string | null>(null);

  // ── Raffle Tab States ─────────────────────────────────────────────────────
  const [raffleItems, setRaffleItems] = useState<RaffleItem[]>([]);
  const [raffleLoading, setRaffleLoading] = useState(false);
  const [raffleFilter, setRaffleFilter] = useState<"all" | "pending" | "approved" | "rejected" | "expired">("all");
  const [raffleSearch, setRaffleSearch] = useState("");
  const [raffleResetting, setRaffleResetting] = useState(false);

  const [newSponsorship, setNewSponsorship] = useState({
    tierName: "",
    price: "",
    maxLimit: 1,
    featured: false,
    perks: "",
  });

  const [currentEvent, setCurrentEvent] = useState<Event>({
    title: "",
    year: new Date().getFullYear().toString(),
    tag: "Upcoming",
    body: "",
    raised: "",
    charityPartner: "",
    location: "",
    eventDate: "",
    cta: "Register Now",
    to: "/golf",
    image: "",
    gallery: [],
    secondary: false,
    createdAt: new Date(),
  });

  useEffect(() => {
    if (!firebaseIsConfigured || !auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchEvents();
        fetchSponsorships();
        fetchPurchases();
        fetchCheckReservations();
        fetchRaffleItems();
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchRaffleItems = async () => {
    setRaffleLoading(true);
    try {
      // 1. Card orders from raffle_orders
      const ordersSnap = await getDocs(query(collection(db, "raffle_orders"), orderBy("createdAt", "desc")));
      const cardItems: RaffleItem[] = ordersSnap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          numbers: d.numbers || [],
          buyerName: d.buyerName || d.name || "Anonymous",
          buyerEmail: d.buyerEmail || d.email || "N/A",
          buyerPhone: d.buyerPhone || d.phone || "",
          paymentMethod: "card",
          amount: d.amount || 0,
          status: "approved",
          timestamp: d.createdAt || d.timestamp || new Date().toISOString(),
          sourceCollection: "raffle_orders",
        };
      });

      // 2. Check reservations from checkReservations
      const checkSnap = await getDocs(
        query(collection(db, "checkReservations"), where("sponsorshipId", "==", "raffle"))
      );
      const checkItems: RaffleItem[] = checkSnap.docs.map((docSnap) => {
        const d = docSnap.data() as CheckReservation;
        return {
          id: docSnap.id,
          numbers: d.numbers || [],
          buyerName: d.buyerName || "Anonymous",
          buyerEmail: d.buyerEmail || "N/A",
          buyerPhone: (d as any).buyerPhone || "",
          paymentMethod: "check",
          amount: d.amount || 0,
          status: d.status || "pending",
          timestamp: d.timestamp || new Date().toISOString(),
          expiresAt: d.expiresAt,
          sourceCollection: "checkReservations",
          rawReservation: { id: docSnap.id, ...d },
        };
      });

      const combined = [...cardItems, ...checkItems].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setRaffleItems(combined);
    } catch (e: any) {
      console.error("Error fetching raffle items:", e);
      toast.error("Failed to load raffle records.");
    } finally {
      setRaffleLoading(false);
    }
  };

  const handleRaffleReset = async () => {
    if (!window.confirm(
      "⚠️ FULL RAFFLE RESET ⚠️\n\n" +
      "This will permanently:\n" +
      "• Clear ALL sold/reserved box numbers from the live board\n" +
      "• Delete ALL raffle card payment orders (raffle_orders)\n" +
      "• Mark ALL raffle check reservations as Rejected (checkReservations)\n\n" +
      "This CANNOT be undone. Type OK in the next prompt to confirm."
    )) return;

    const confirm2 = window.prompt("Type RESET to confirm. All raffle data will be cleared:");
    if (confirm2?.trim().toUpperCase() !== "RESET") {
      toast.error("Reset cancelled — confirmation text did not match.");
      return;
    }

    setRaffleResetting(true);
    try {
      let deleted = 0;
      let rejected = 0;

      // 1. Clear soldNumbers on raffle_tickets/board
      await setDoc(doc(db, "raffle_tickets", "board"), {
        soldNumbers: [],
        updatedAt: new Date().toISOString(),
      }, { merge: false });

      // 2. Delete all raffle_orders (card payments)
      const ordersSnap = await getDocs(collection(db, "raffle_orders"));
      for (const d of ordersSnap.docs) {
        await deleteDoc(doc(db, "raffle_orders", d.id));
        deleted++;
      }

      // 3. Mark all raffle checkReservations as rejected
      const checkSnap = await getDocs(
        query(collection(db, "checkReservations"), where("sponsorshipId", "==", "raffle"))
      );
      for (const d of checkSnap.docs) {
        await updateDoc(doc(db, "checkReservations", d.id), { status: "rejected" });
        rejected++;
      }

      toast.success(`Raffle reset complete — board cleared, ${deleted} order(s) deleted, ${rejected} reservation(s) rejected.`);
      await fetchRaffleItems();
    } catch (e: any) {
      console.error("Raffle reset error:", e);
      toast.error("Reset failed: " + (e.message || "unknown error"));
    } finally {
      setRaffleResetting(false);
    }
  };

  const fetchCheckReservations = async () => {
    setCheckReservationsLoading(true);
    try {
      const q = query(collection(db, "checkReservations"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CheckReservation[];
      setCheckReservations(data);
    } catch (e: any) {
      console.error("Error fetching check reservations:", e);
      toast.error("Failed to load check reservations.");
    } finally {
      setCheckReservationsLoading(false);
    }
  };

  const handleApproveReservation = async (reservation: CheckReservation) => {
    setProcessingReservationId(reservation.id);
    try {
      await updateDoc(doc(db, "checkReservations", reservation.id), { status: "approved" });

      const isSponsorship = reservation.sponsorshipId !== "donation" &&
                            reservation.sponsorshipId !== "individual" &&
                            reservation.sponsorshipId !== "foursome" &&
                            reservation.sponsorshipId !== "cocktail";
      if (isSponsorship && reservation.sponsorshipId !== "raffle") {
        const sponsorRef = doc(db, "sponsorships", reservation.sponsorshipId);
        await updateDoc(sponsorRef, {
          soldCount: increment(1),
          reservedCount: increment(-1),
        });
      }

      await addDoc(collection(db, "purchases"), {
        timestamp: new Date().toISOString(),
        buyerName: reservation.buyerName,
        buyerEmail: reservation.buyerEmail,
        packageName: reservation.packageName,
        amount: reservation.amount,
        paymentStatus: "success",
        failureReason: null,
        squarePaymentId: null,
        source: "Check Payment",
      });

      toast.success(`${reservation.buyerName} approved!`);
      fetchCheckReservations();
      fetchSponsorships();
      fetchRaffleItems();
    } catch (e: any) {
      console.error("Error approving reservation:", e);
      toast.error("Failed to approve reservation.");
    } finally {
      setProcessingReservationId(null);
    }
  };

  const handleRejectReservation = async (reservation: CheckReservation) => {
    if (reservation.status !== "pending") return;
    if (!window.confirm(`Reject ${reservation.buyerName}'s reservation? Spot will be freed.`)) return;
    setProcessingReservationId(reservation.id);
    try {
      await updateDoc(doc(db, "checkReservations", reservation.id), { status: "rejected" });

      const isSponsorship = reservation.sponsorshipId !== "donation" &&
                            reservation.sponsorshipId !== "individual" &&
                            reservation.sponsorshipId !== "foursome" &&
                            reservation.sponsorshipId !== "cocktail";
      if (isSponsorship && reservation.sponsorshipId !== "raffle") {
        const sponsorRef = doc(db, "sponsorships", reservation.sponsorshipId);
        await updateDoc(sponsorRef, {
          reservedCount: increment(-1),
        });
      } else if (reservation.sponsorshipId === "raffle" && reservation.numbers?.length) {
        await updateDoc(doc(db, "raffle_tickets", "board"), {
          soldNumbers: arrayRemove(...reservation.numbers),
        });
      }

      toast.success("Reservation rejected. Spot freed.");
      fetchCheckReservations();
      fetchSponsorships();
      fetchRaffleItems();
    } catch (e: any) {
      console.error("Error rejecting reservation:", e);
      toast.error("Failed to reject reservation.");
    } finally {
      setProcessingReservationId(null);
    }
  };

  const handleManualExpire = async () => {
    const now = new Date().toISOString();
    try {
      const snap = await getDocs(
        query(collection(db, "checkReservations"), where("status", "==", "pending"))
      );
      let count = 0;
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.expiresAt && data.expiresAt <= now) {
          await updateDoc(doc(db, "checkReservations", docSnap.id), { status: "expired" });
          const isSponsorship = data.sponsorshipId !== "donation" &&
                                data.sponsorshipId !== "individual" &&
                                data.sponsorshipId !== "foursome" &&
                                data.sponsorshipId !== "cocktail";
          if (isSponsorship && data.sponsorshipId !== "raffle") {
            await updateDoc(doc(db, "sponsorships", data.sponsorshipId), {
              reservedCount: increment(-1),
            });
          } else if (data.sponsorshipId === "raffle" && data.numbers?.length) {
            await updateDoc(doc(db, "raffle_tickets", "board"), {
              soldNumbers: arrayRemove(...data.numbers),
            });
          }
          count++;
        }
      }
      toast.success(`${count} expired reservation(s) cleared.`);
      fetchCheckReservations();
      fetchSponsorships();
    } catch (e: any) {
      console.error("Error manual expiring reservations:", e);
      toast.error("Failed to expire overdue reservations.");
    }
  };

  const fetchSponsorships = async () => {
    setSponsorshipsLoading(true);
    try {
      const snap = await getDocs(collection(db, "sponsorships"));
      const dbData: Record<string, any> = {};
      snap.forEach((docSnap) => { dbData[docSnap.id] = docSnap.data(); });
      setSponsorships(buildSponsorshipRows(dbData, { includeHidden: true }));
    } catch (e: any) {
      console.error("Error fetching sponsorships:", e);
      toast.error("Failed to load sponsorships.");
    } finally {
      setSponsorshipsLoading(false);
    }
  };

  const fetchPurchases = async () => {
    setPurchasesLoading(true);
    try {
      const q = query(collection(db, "purchases"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const fetchedPurchases = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Purchase[];
      setPurchases(fetchedPurchases);
    } catch (e: any) {
      console.error("Error fetching purchases:", e);
      toast.error("Failed to load purchases.");
    } finally {
      setPurchasesLoading(false);
    }
  };

  const filteredPurchases = purchases
    .filter(p => purchasesFilter === "All" ? true : purchasesFilter === "Success" ? p.paymentStatus === "success" : p.paymentStatus === "failed")
    .sort((a, b) => {
      if (purchasesSort === "date_desc") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (purchasesSort === "date_asc") return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (purchasesSort === "amount_desc") return b.amount - a.amount;
      if (purchasesSort === "amount_asc") return a.amount - b.amount;
      return 0;
    });

  const handleExportPurchasesExcel = () => {
    if (filteredPurchases.length === 0) {
      toast.error("No purchases in current view to export.");
      return;
    }

    const dataToExport = filteredPurchases.map((p) => ({
      "Date": new Date(p.timestamp).toLocaleString(),
      "Buyer Name": p.buyerName || "",
      "Buyer Email": p.buyerEmail || "",
      "Package": p.packageName || "",
      "Amount": typeof p.amount === "number" ? p.amount : Number(p.amount || 0),
      "Status": p.paymentStatus || "",
      "Failure Reason": p.failureReason || "",
      "Source": p.source || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchases");

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `smg-cares-purchases-${dateStr}.xlsx`;

    XLSX.writeFile(workbook, filename);
    toast.success(`Exported ${filteredPurchases.length} purchase record(s) to Excel.`);
  };

  const handleSaveSponsorship = async (s: any) => {
    setSavingSponsorId(s.id);
    try {
      const docRef = doc(db, "sponsorships", s.id);
      await setDoc(docRef, {
        soldCount: Number(s.soldCount),
        reservedCount: Number(s.reservedCount),
        maxLimit: Number(s.maxLimit),
      }, { merge: true });
      toast.success(`${s.tierName} slots updated successfully!`);
      fetchSponsorships();
    } catch (e: any) {
      console.error("Error saving sponsorship slots:", e);
      toast.error("Failed to save sponsorship slots.");
    } finally {
      setSavingSponsorId(null);
    }
  };

  const handleUpdateSponsorship = async (s: any) => {
    if (!s.tierName?.trim() || !s.price?.trim()) {
      toast.error("Please provide a sponsorship name and price.");
      return;
    }
    setMutatingSponsorId(s.id);
    try {
      const docRef = doc(db, "sponsorships", s.id);
      const perksList = Array.isArray(s.perks)
        ? s.perks.map((p: string) => p.trim()).filter(Boolean)
        : typeof s.perks === "string"
        ? (s.perks as string).split("\n").map((p: string) => p.trim()).filter(Boolean)
        : [];

      await setDoc(docRef, {
        tierName: s.tierName.trim(),
        price: s.price.trim(),
        soldCount: Number(s.soldCount ?? 0),
        reservedCount: Number(s.reservedCount ?? 0),
        maxLimit: Number(s.maxLimit ?? 1),
        featured: !!s.featured,
        hidden: !!s.hidden,
        perks: perksList,
        custom: !!s.custom,
        numberOfGolferSlots: Number(s.numberOfGolferSlots ?? 0),
      }, { merge: true });

      toast.success(`${s.tierName} updated successfully!`);
      setEditingSponsorship(null);
      fetchSponsorships();
    } catch (e: any) {
      console.error("Error updating sponsorship:", e);
      toast.error("Failed to update sponsorship.");
    } finally {
      setMutatingSponsorId(null);
    }
  };

  const handleAddSponsorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsorship.tierName.trim() || !newSponsorship.price.trim()) {
      toast.error("Please provide a sponsorship name and price.");
      return;
    }
    setMutatingSponsorId("new");
    try {
      const slug = newSponsorship.tierName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const docId = `custom-${slug || Date.now()}`;
      const perks = newSponsorship.perks.split("\n").map((perk) => perk.trim()).filter(Boolean);
      await setDoc(doc(db, "sponsorships", docId), {
        tierName: newSponsorship.tierName.trim(),
        price: newSponsorship.price.trim(),
        soldCount: 0,
        reservedCount: 0,
        maxLimit: Math.max(1, Number(newSponsorship.maxLimit) || 1),
        featured: newSponsorship.featured,
        perks,
        custom: true,
        hidden: false,
      });
      setNewSponsorship({ tierName: "", price: "", maxLimit: 1, featured: false, perks: "" });
      toast.success("Sponsorship added successfully!");
      fetchSponsorships();
    } catch (e: any) {
      console.error("Error adding sponsorship:", e);
      toast.error("Failed to add sponsorship.");
    } finally {
      setMutatingSponsorId(null);
    }
  };

  const handleToggleSponsorshipVisibility = async (s: any) => {
    setMutatingSponsorId(s.id);
    try {
      const docRef = doc(db, "sponsorships", s.id);
      await setDoc(docRef, {
        tierName: s.tierName, price: s.price,
        soldCount: Number(s.soldCount), reservedCount: Number(s.reservedCount),
        maxLimit: Number(s.maxLimit), featured: !!s.featured,
        perks: s.perks ?? [], custom: !!s.custom, hidden: !s.hidden,
      }, { merge: true });
      toast.success(s.hidden ? `${s.tierName} restored to the site.` : `${s.tierName} removed from the site.`);
      fetchSponsorships();
    } catch (e: any) {
      console.error("Error toggling sponsorship visibility:", e);
      toast.error("Failed to update sponsorship visibility.");
    } finally {
      setMutatingSponsorId(null);
    }
  };

  const updateLocalSponsorship = (id: string, field: string, val: any) => {
    setSponsorships(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseIsConfigured || !auth) {
      toast.error("Firebase is not configured.");
      return;
    }
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setUser(credential.user);
      fetchEvents();
      fetchSponsorships();
      fetchPurchases();
      fetchCheckReservations();
      toast.success("Welcome back, Admin!");
    } catch (error: any) {
      toast.error("Login failed. Check credentials.");
    }
  };

  const handleLogout = async () => {
    if (!auth) { setUser(null); return; }
    await signOut(auth);
    toast.success("Logged out successfully.");
  };

  const fetchEvents = async () => {
    if (!firebaseIsConfigured) { setLoading(false); return; }
    setLoading(true);
    try {
      const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      setEvents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Event[]);
    } catch (error: any) {
      console.error("Firestore Error:", error);
      toast.error(`Database Error: ${error.message || "Failed to connect"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchSponsorships();
    const timer = setTimeout(() => { setLoading(prev => { if (prev) console.warn("Loading timed out."); return false; }); }, 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpload = () => {
    // @ts-ignore
    const widget = window.cloudinary.createUploadWidget(
      { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME, uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          setCurrentEvent(prev => ({ ...prev, image: result.info.secure_url }));
          toast.success("Image uploaded successfully!");
        }
      }
    );
    widget.open();
  };

  const handleGalleryUpload = () => {
    // @ts-ignore
    const widget = window.cloudinary.createUploadWidget(
      { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME, uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          setCurrentEvent(prev => ({ ...prev, gallery: [...(prev.gallery || []), result.info.secure_url] }));
          toast.success("Gallery image added!");
        }
      }
    );
    widget.open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing && currentEvent.id) {
        await updateDoc(doc(db, "events", currentEvent.id), { ...currentEvent });
        toast.success("Event updated successfully!");
      } else {
        await addDoc(collection(db, "events"), { ...currentEvent, createdAt: new Date() });
        toast.success("Event created successfully!");
      }
      setIsEditing(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast.error("Failed to save event.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteDoc(doc(db, "events", id));
      toast.success("Event deleted!");
      fetchEvents();
    } catch (error) {
      toast.error("Delete failed.");
    }
  };

  const resetForm = () => {
    setCurrentEvent({
      title: "", year: new Date().getFullYear().toString(), tag: "Upcoming",
      body: "", raised: "", charityPartner: "", location: "", eventDate: "",
      cta: "Register Now", to: "/golf", image: "", gallery: [], secondary: false, createdAt: new Date(),
    });
  };

  const pendingCount = checkReservations.filter(r => r.status === "pending").length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="min-h-[80vh] flex items-center justify-center px-4 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md p-8 rounded-[2.5rem] bg-white border border-border shadow-elegant mt-11 mb-7"
          >
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-accent-soft rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-soft">
                <Lock className="text-accent" size={32} />
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Admin Login</h1>
              <p className="text-muted-foreground mt-2 text-sm font-medium">Access your event management tools</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Email Address</label>
                <Input type="email" placeholder="smgcares.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl bg-surface border-border h-14 focus:border-accent focus:ring-1 focus:ring-accent transition-all px-5 text-foreground placeholder:text-muted-foreground" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Password</label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="rounded-2xl bg-surface border-border h-14 focus:border-accent focus:ring-1 focus:ring-accent transition-all px-5 pr-14 text-foreground placeholder:text-muted-foreground" required />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-14 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-accent hover:bg-accent/90 text-white font-bold text-lg shadow-lg shadow-accent/20 transition-transform active:scale-[0.98] hover-lift">
                Sign In
              </Button>
            </form>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  const pendingRaffleCount = raffleItems.filter(i => i.status === "pending").length;

  const tabTitle = {
    events: "Event Manager",
    sponsorships: "Sponsorship Manager",
    purchases: "Purchase History",
    checkReservations: "Check Reservations",
    raffle: "2026 Raffle Board Manager",
  }[activeAdminTab];

  const tabDesc = {
    events: "Manage your foundation's impact and upcoming events.",
    sponsorships: "Track and adjust real-time sponsorship availability, claims, and limits.",
    purchases: "View a read-only log of all successful and failed payment attempts.",
    checkReservations: "Review and approve or reject pending check payment reservations.",
    raffle: "Real-time summary, number lookup, card sales, and check reservations for the 2026 Raffle.",
  }[activeAdminTab];

  return (
    <PageShell>
      <div className="pt-32 pb-20 bg-background min-h-screen text-foreground">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-6">
            <div>
              <h1 className="font-display text-6xl tracking-tighter mb-4 text-foreground">{tabTitle}</h1>
              <p className="text-muted-foreground text-lg">{tabDesc}</p>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Tab Switcher */}
              <div className="bg-[#f0f2f5] p-1.5 rounded-2xl flex border gap-1 flex-wrap">
                <button onClick={() => setActiveAdminTab("events")}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${activeAdminTab === "events" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
                  Events
                </button>
                <button onClick={() => { setActiveAdminTab("sponsorships"); fetchSponsorships(); }}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${activeAdminTab === "sponsorships" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
                  Sponsorship Slots
                </button>
                <button onClick={() => { setActiveAdminTab("purchases"); fetchPurchases(); }}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${activeAdminTab === "purchases" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
                  Purchases
                </button>
                <button onClick={() => { setActiveAdminTab("checkReservations"); fetchCheckReservations(); }}
                  className={`relative px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${activeAdminTab === "checkReservations" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
                  Check Reservations
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button onClick={() => { setActiveAdminTab("raffle"); fetchRaffleItems(); }}
                  className={`relative px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${activeAdminTab === "raffle" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
                  2026 Raffle
                  {pendingRaffleCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {pendingRaffleCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleLogout}
                  className="rounded-full h-14 w-14 bg-white border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-500 group transition-all shadow-sm" title="Log Out">
                  <LogOut size={24} className="group-hover:scale-110 transition-transform" />
                </Button>
                {activeAdminTab === "events" && !isEditing && (
                  <Button onClick={() => { resetForm(); setIsEditing(true); }}
                    className="rounded-full h-14 px-8 bg-accent hover:bg-accent/90 text-white font-bold font-display text-lg flex items-center gap-2 shadow-lg shadow-accent/20 hover-lift">
                    <Plus size={24} /> New Event
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── EVENTS TAB ── */}
          {activeAdminTab === "events" ? (
            isEditing ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-border rounded-3xl p-8 max-w-2xl mx-auto shadow-elegant">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-display text-foreground">{currentEvent.id ? "Edit Event" : "Create New Event"}</h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="rounded-full hover:bg-surface">
                    <X className="text-muted-foreground" />
                  </Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Event Title</label>
                      <Input value={currentEvent.title} onChange={e => setCurrentEvent({ ...currentEvent, title: e.target.value })}
                        placeholder="Annual Charity Outing" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Year</label>
                      <Input value={currentEvent.year} onChange={e => setCurrentEvent({ ...currentEvent, year: e.target.value })}
                        placeholder="2026" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Tag</label>
                      <Input value={currentEvent.tag} onChange={e => setCurrentEvent({ ...currentEvent, tag: e.target.value })}
                        placeholder="Upcoming / Past Event" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Event Date</label>
                      <Input value={currentEvent.eventDate || ""} onChange={e => setCurrentEvent({ ...currentEvent, eventDate: e.target.value })}
                        placeholder="e.g. Monday September 28th 2026" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Charity Partner</label>
                      <Input value={currentEvent.charityPartner || ""} onChange={e => setCurrentEvent({ ...currentEvent, charityPartner: e.target.value })}
                        placeholder="e.g. Fight CRC - https://..." className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Event Location</label>
                      <Input value={currentEvent.location || ""} onChange={e => setCurrentEvent({ ...currentEvent, location: e.target.value })}
                        placeholder="e.g. The Muttontown Club" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Raised Amount</label>
                      <Input value={currentEvent.raised || ""} onChange={e => setCurrentEvent({ ...currentEvent, raised: e.target.value })}
                        placeholder="$XXX,XXX" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">CTA Text</label>
                      <Input value={currentEvent.cta} onChange={e => setCurrentEvent({ ...currentEvent, cta: e.target.value })}
                        placeholder="Register Now" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Link (Route)</label>
                      <Input value={currentEvent.to} onChange={e => setCurrentEvent({ ...currentEvent, to: e.target.value })}
                        placeholder="/golf" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Description</label>
                    <Textarea value={currentEvent.body} onChange={e => setCurrentEvent({ ...currentEvent, body: e.target.value })}
                      placeholder="Tell the story of this event..." className="bg-surface border-border rounded-xl min-h-[120px] focus:border-accent focus:ring-1 focus:ring-accent text-foreground" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Event Image</label>
                    <div className="flex gap-4 items-center">
                      {currentEvent.image && (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border shadow-sm">
                          <img src={currentEvent.image} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <Button type="button" onClick={handleUpload} variant="outline"
                        className="flex-1 h-20 border-dashed border-border hover:border-accent bg-transparent hover:bg-surface rounded-xl text-muted-foreground hover:text-foreground transition-all">
                        <ImageIcon className="mr-2 opacity-50" />
                        {currentEvent.image ? "Change Image" : "Upload Event Image"}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Gallery Images</label>
                    {currentEvent.gallery && currentEvent.gallery.length > 0 && (
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        {currentEvent.gallery.map((img, idx) => (
                          <div key={idx} className="relative w-full aspect-square rounded-xl overflow-hidden border border-border shadow-sm group">
                            <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setCurrentEvent(prev => ({ ...prev, gallery: prev.gallery?.filter((_, i) => i !== idx) }))}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button type="button" onClick={handleGalleryUpload} variant="outline"
                      className="w-full h-14 border-dashed border-border hover:border-accent bg-transparent hover:bg-surface rounded-xl text-muted-foreground hover:text-foreground transition-all">
                      <ImageIcon className="mr-2 opacity-50" /> Add Gallery Image
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={currentEvent.secondary} onChange={e => setCurrentEvent({ ...currentEvent, secondary: e.target.checked })}
                      className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent" />
                    <label className="text-sm text-muted-foreground font-medium">Mark as secondary (smaller card)</label>
                  </div>
                  <Button type="submit" disabled={loading}
                    className="w-full h-14 bg-accent hover:bg-accent/90 text-white rounded-xl font-display text-lg shadow-lg shadow-accent/20 hover-lift">
                    {loading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" /> {currentEvent.id ? "Update Event" : "Create Event"}</>}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {loading ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" size={40} /></div>
                ) : !firebaseIsConfigured ? (
                  <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-white shadow-sm">
                    <h3 className="text-xl font-display mb-4 text-foreground">Configuration Required</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">Update your <strong>.env</strong> file with Firebase and Cloudinary credentials.</p>
                    <Button variant="outline" onClick={() => fetchEvents()} className="rounded-full border-border hover:bg-surface text-foreground">Check Connection Again</Button>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-border bg-white rounded-3xl shadow-sm">
                    <p className="text-muted-foreground font-medium">No events found. Start by creating one!</p>
                  </div>
                ) : (
                  events.map(event => (
                    <motion.div key={event.id} layout className="flex items-center gap-6 p-4 bg-white border border-border rounded-2xl group hover:shadow-soft transition-all">
                      <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-border shadow-sm">
                        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{event.tag}</span>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="text-xs text-muted-foreground font-medium">{event.year}</span>
                        </div>
                        <h3 className="text-xl font-display text-foreground">{event.title}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setCurrentEvent(event); setIsEditing(true); }}
                          className="rounded-full hover:bg-surface text-muted-foreground hover:text-accent"><Pencil size={18} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id!)}
                          className="rounded-full hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 size={18} /></Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )

          /* ── SPONSORSHIPS TAB ── */
          ) : activeAdminTab === "sponsorships" ? (
            <div className="space-y-6">
              <div className="bg-white border border-border rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-display text-foreground">Add Sponsorship</h3>
                  <p className="text-sm text-muted-foreground">Create a new sponsorship card for the Golf Register page.</p>
                </div>
                <Button type="button" onClick={() => setShowAddSponsorshipForm(open => !open)}
                  className="rounded-full h-11 px-5 bg-accent hover:bg-accent/90 text-white font-bold">
                  <Plus size={16} className="mr-2" />
                  {showAddSponsorshipForm ? "Hide Form" : "Add Sponsorship"}
                </Button>
              </div>

              {showAddSponsorshipForm && (
                <form onSubmit={handleAddSponsorship} className="bg-white border border-border rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Name</label>
                      <Input value={newSponsorship.tierName} onChange={(e) => setNewSponsorship(prev => ({ ...prev, tierName: e.target.value }))}
                        placeholder="Custom Sponsor Name" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Price</label>
                      <Input value={newSponsorship.price} onChange={(e) => setNewSponsorship(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="$1,000" className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Max Limit</label>
                      <Input type="number" min={1} value={newSponsorship.maxLimit} onChange={(e) => setNewSponsorship(prev => ({ ...prev, maxLimit: Number(e.target.value) }))}
                        className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Perks</label>
                      <Textarea value={newSponsorship.perks} onChange={(e) => setNewSponsorship(prev => ({ ...prev, perks: e.target.value }))}
                        placeholder="One perk per line" className="bg-surface border-border rounded-xl min-h-[110px] focus:border-accent focus:ring-1 focus:ring-accent text-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="featured-sponsorship" type="checkbox" checked={newSponsorship.featured}
                      onChange={(e) => setNewSponsorship(prev => ({ ...prev, featured: e.target.checked }))}
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                    <label htmlFor="featured-sponsorship" className="text-sm text-muted-foreground font-medium">Mark as featured</label>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowAddSponsorshipForm(false)}
                      className="rounded-full h-11 px-5 border-border text-foreground">Cancel</Button>
                    <Button type="submit" disabled={mutatingSponsorId !== null}
                      className="rounded-full h-11 px-5 bg-accent hover:bg-accent/90 text-white font-bold">
                      <Plus size={16} className="mr-2" /> Add Sponsorship
                    </Button>
                  </div>
                </form>
              )}

              {sponsorshipsLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" size={40} /></div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {sponsorships.map((s) => {
                    const remaining = s.maxLimit === -1 ? Infinity : s.maxLimit - s.soldCount - s.reservedCount;
                    const isSoldOut = s.maxLimit !== -1 && remaining <= 0;
                    return (
                      <motion.div key={s.id} layout
                        className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-soft ${s.hidden ? "border-dashed border-amber-200 bg-amber-50/30 opacity-80" : isSoldOut ? "border-red-200 bg-red-50/5" : "border-border"}`}>
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <h3 className="text-lg font-bold font-display text-primary leading-tight">{s.tierName}</h3>
                            <div className="px-3 py-1 rounded-full bg-accent-soft text-accent text-xs font-black font-display tracking-wide whitespace-nowrap">{s.price}</div>
                          </div>
                          {s.hidden && (
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-[11px] font-black uppercase tracking-widest">Hidden from site</div>
                          )}
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {/* Sold */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block text-center">Sold</label>
                              <div className="flex items-center gap-1 bg-surface border rounded-xl p-1 h-10">
                                <button type="button" onClick={() => updateLocalSponsorship(s.id, "soldCount", Math.max(0, s.soldCount - 1))} className="w-7 h-7 rounded-lg hover:bg-muted text-foreground flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">-</button>
                                <span className="flex-1 text-center font-bold text-sm select-none">{s.soldCount}</span>
                                <button type="button" onClick={() => updateLocalSponsorship(s.id, "soldCount", s.soldCount + 1)} className="w-7 h-7 rounded-lg hover:bg-muted text-foreground flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">+</button>
                              </div>
                            </div>
                            {/* Reserved */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block text-center">Reserved</label>
                              <div className="flex items-center gap-1 bg-surface border rounded-xl p-1 h-10">
                                <button type="button" onClick={() => updateLocalSponsorship(s.id, "reservedCount", Math.max(0, s.reservedCount - 1))} className="w-7 h-7 rounded-lg hover:bg-muted text-foreground flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">-</button>
                                <span className="flex-1 text-center font-bold text-sm select-none">{s.reservedCount}</span>
                                <button type="button" onClick={() => updateLocalSponsorship(s.id, "reservedCount", s.reservedCount + 1)} className="w-7 h-7 rounded-lg hover:bg-muted text-foreground flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">+</button>
                              </div>
                            </div>
                            {/* Limit */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block text-center">Limit</label>
                              {s.maxLimit === -1 ? (
                                <div className="h-10 border rounded-xl flex items-center justify-center text-[10px] font-bold text-muted-foreground bg-muted/40 gap-0.5 select-none"><InfinityIcon size={10} /> Unlimited</div>
                              ) : (
                                <div className="flex items-center gap-1 bg-surface border rounded-xl p-1 h-10">
                                  <button type="button" onClick={() => updateLocalSponsorship(s.id, "maxLimit", Math.max(1, s.maxLimit - 1))} className="w-7 h-7 rounded-lg hover:bg-muted text-foreground flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">-</button>
                                  <span className="flex-1 text-center font-bold text-sm select-none">{s.maxLimit}</span>
                                  <button type="button" onClick={() => updateLocalSponsorship(s.id, "maxLimit", s.maxLimit + 1)} className="w-7 h-7 rounded-lg hover:bg-muted text-foreground flex items-center justify-center font-bold text-sm active:scale-90 transition-transform">+</button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-[11px] font-bold py-2 px-3 bg-muted/45 rounded-xl border border-muted/50 select-none">
                            {s.maxLimit === -1 ? (
                              <span className="text-muted-foreground flex items-center gap-1"><InfinityIcon size={12} /> Unlimited slots available</span>
                            ) : isSoldOut ? (
                              <span className="text-red-500 font-extrabold uppercase tracking-wider flex items-center gap-1">● Claimed / Sold Out</span>
                            ) : (
                              <span className="text-green-600 flex items-center gap-1">● {remaining} of {s.maxLimit} spots left</span>
                            )}
                            {s.maxLimit !== -1 && <span className="text-muted-foreground/80 font-medium">({s.soldCount} sold, {s.reservedCount} reserved)</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-muted/70 pt-4 mt-5">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id={`unlimited-${s.id}`} checked={s.maxLimit === -1}
                              onChange={(e) => updateLocalSponsorship(s.id, "maxLimit", e.target.checked ? -1 : (defaultSponsorships.find(d => d.id === s.id)?.maxLimit || 1))}
                              className="w-4 h-4 rounded border-border text-accent focus:ring-accent cursor-pointer" />
                            <label htmlFor={`unlimited-${s.id}`} className="text-xs font-semibold text-muted-foreground select-none cursor-pointer">Unlimited slots</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => setEditingSponsorship({ ...s })}
                              className="h-9 px-3 rounded-xl text-xs font-bold border-border text-foreground flex items-center gap-1.5 shadow-sm active:scale-[0.97] transition-all">
                              <Pencil size={12} /> Edit
                            </Button>
                            <Button type="button" variant="outline" disabled={mutatingSponsorId === s.id} onClick={() => handleToggleSponsorshipVisibility(s)}
                              className="h-9 px-4 rounded-xl text-xs font-bold border-border text-foreground flex items-center gap-1.5 shadow-sm active:scale-[0.97] transition-all">
                              {mutatingSponsorId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              {s.hidden ? "Restore" : "Remove"}
                            </Button>
                            <Button type="button" disabled={savingSponsorId !== null} onClick={() => handleSaveSponsorship(s)}
                              className="h-9 px-4 rounded-xl text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground flex items-center gap-1.5 shadow-sm active:scale-[0.97] transition-all">
                              {savingSponsorId === s.id ? <Loader2 size={12} className="animate-spin text-primary-foreground" /> : <Save size={12} />}
                              Save Slots
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Edit Sponsorship Dialog */}
              <Dialog open={!!editingSponsorship} onOpenChange={(open) => { if (!open) setEditingSponsorship(null); }}>
                <DialogContent className="sm:max-w-[550px] bg-white rounded-3xl p-6 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl text-foreground flex items-center gap-2">
                      <Pencil size={20} className="text-accent" />
                      Edit Sponsorship: {editingSponsorship?.tierName}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                      Update details for this sponsorship option (price, name, perks, limit, status).
                    </DialogDescription>
                  </DialogHeader>

                  {editingSponsorship && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateSponsorship(editingSponsorship);
                    }} className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Sponsorship Name *</label>
                          <Input
                            value={editingSponsorship.tierName || ""}
                            onChange={(e) => setEditingSponsorship({ ...editingSponsorship, tierName: e.target.value })}
                            className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Price *</label>
                          <Input
                            value={editingSponsorship.price || ""}
                            onChange={(e) => setEditingSponsorship({ ...editingSponsorship, price: e.target.value })}
                            placeholder="$1,000"
                            className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Max Limit</label>
                          <Input
                            type="number"
                            min={-1}
                            value={editingSponsorship.maxLimit}
                            onChange={(e) => setEditingSponsorship({ ...editingSponsorship, maxLimit: Number(e.target.value) })}
                            className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground"
                          />
                          <p className="text-[11px] text-muted-foreground">Use -1 for unlimited slots.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Golfer Slots</label>
                          <Input
                            type="number"
                            min={0}
                            value={editingSponsorship.numberOfGolferSlots ?? 0}
                            onChange={(e) => setEditingSponsorship({ ...editingSponsorship, numberOfGolferSlots: Number(e.target.value) })}
                            className="bg-surface border-border rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-foreground"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Perks (One per line)</label>
                        <Textarea
                          value={Array.isArray(editingSponsorship.perks) ? editingSponsorship.perks.join("\n") : (editingSponsorship.perks || "")}
                          onChange={(e) => setEditingSponsorship({ ...editingSponsorship, perks: e.target.value.split("\n") })}
                          className="bg-surface border-border rounded-xl min-h-[100px] focus:border-accent focus:ring-1 focus:ring-accent text-foreground"
                          placeholder="One perk per line"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-6 pt-2">
                        <div className="flex items-center gap-2">
                          <input
                            id="edit-featured"
                            type="checkbox"
                            checked={!!editingSponsorship.featured}
                            onChange={(e) => setEditingSponsorship({ ...editingSponsorship, featured: e.target.checked })}
                            className="w-4 h-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
                          />
                          <label htmlFor="edit-featured" className="text-sm font-semibold text-foreground cursor-pointer">Mark as featured</label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            id="edit-hidden"
                            type="checkbox"
                            checked={!!editingSponsorship.hidden}
                            onChange={(e) => setEditingSponsorship({ ...editingSponsorship, hidden: e.target.checked })}
                            className="w-4 h-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
                          />
                          <label htmlFor="edit-hidden" className="text-sm font-semibold text-foreground cursor-pointer">Hide from site</label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="outline" onClick={() => setEditingSponsorship(null)} className="rounded-full px-5">
                          Cancel
                        </Button>
                        <Button type="submit" disabled={mutatingSponsorId !== null} className="rounded-full px-6 bg-accent hover:bg-accent/90 text-white font-bold">
                          {mutatingSponsorId === editingSponsorship.id ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>

          /* ── PURCHASES TAB ── */
          ) : activeAdminTab === "purchases" ? (
            <div className="space-y-6">
              <div className="bg-white border border-border rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-display text-foreground">Purchases Log</h3>
                  <p className="text-sm text-muted-foreground">View all successful and failed payment attempts.</p>
                </div>
                <div className="flex items-center gap-3">
                  <select value={purchasesFilter} onChange={(e) => setPurchasesFilter(e.target.value as any)}
                    className="bg-surface border-border rounded-xl px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none font-medium text-foreground">
                    <option value="All">All Statuses</option>
                    <option value="Success">Success</option>
                    <option value="Failed">Failed</option>
                  </select>
                  <Button
                    onClick={handleExportPurchasesExcel}
                    disabled={filteredPurchases.length === 0}
                    variant="outline"
                    className="rounded-xl h-10 px-4 text-sm font-bold border-border text-foreground flex items-center gap-2 "
                  >
                    <Download size={16} />
                    Export to Excel
                  </Button>
                </div>
              </div>

              {purchasesLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" size={40} /></div>
              ) : (
                <div className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface/50 border-b border-border">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap cursor-pointer hover:bg-surface transition-colors"
                            onClick={() => setPurchasesSort(purchasesSort === "date_desc" ? "date_asc" : "date_desc")}>
                            Date {purchasesSort.startsWith("date") ? (purchasesSort === "date_desc" ? "↓" : "↑") : ""}
                          </th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Buyer</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Package</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap cursor-pointer hover:bg-surface transition-colors"
                            onClick={() => setPurchasesSort(purchasesSort === "amount_desc" ? "amount_asc" : "amount_desc")}>
                            Amount {purchasesSort.startsWith("amount") ? (purchasesSort === "amount_desc" ? "↓" : "↑") : ""}
                          </th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Status</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredPurchases.map((p) => (
                            <tr key={p.id} className="hover:bg-surface/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">{new Date(p.timestamp).toLocaleString()}</td>
                              <td className="px-6 py-4 text-sm">
                                <div className="font-bold text-primary">{p.buyerName}</div>
                                <div className="text-muted-foreground text-xs">{p.buyerEmail}</div>
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{p.packageName}</td>
                              <td className="px-6 py-4 text-sm font-bold text-foreground">${p.amount.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col items-start gap-1">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${p.paymentStatus === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {p.paymentStatus}
                                  </span>
                                  {p.paymentStatus === "failed" && p.failureReason && (
                                    <span className="text-[10px] text-red-500 max-w-[200px] truncate" title={p.failureReason}>{p.failureReason}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{p.source}</td>
                            </tr>
                          ))}
                        {filteredPurchases.length === 0 && (
                          <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">No purchases found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          /* ── CHECK RESERVATIONS TAB ── */
          ) : activeAdminTab === "checkReservations" ? (
            <div className="space-y-6">
              <div className="bg-white border border-border rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-display text-foreground">Check Reservations</h3>
                  <p className="text-sm text-muted-foreground">
                    Approve or reject pending check payments. Approving confirms the spot and logs a purchase.
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <select value={checkReservationsFilter} onChange={(e) => setCheckReservationsFilter(e.target.value as any)}
                    className="bg-surface border-border rounded-xl px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none font-medium text-foreground">
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                    <option value="all">All</option>
                  </select>
                  <Button onClick={fetchCheckReservations} variant="outline" className="rounded-xl h-10 px-4 text-sm font-bold">
                    Refresh
                  </Button>
                  <Button onClick={handleManualExpire} variant="outline" className="rounded-xl h-10 px-4 border-amber-200 text-amber-700 hover:bg-amber-50 text-sm font-bold">
                    ⏰ Expire Overdue
                  </Button>
                </div>
              </div>

              {checkReservationsLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" size={40} /></div>
              ) : (
                <div className="space-y-4">
                  {checkReservations
                    .filter(r => checkReservationsFilter === "all" ? true : r.status === checkReservationsFilter)
                    .map((r) => {
                      const isOverdue = r.status === "pending" && r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now();
                      return (
                        <motion.div key={r.id} layout
                          className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                            r.status === "pending" ? "border-amber-200 bg-amber-50/20" :
                            r.status === "approved" ? "border-green-200 bg-green-50/20" :
                            r.status === "rejected" ? "border-red-200 bg-red-50/20 opacity-75" :
                            "border-gray-200 bg-gray-50/50 opacity-60"
                          }`}>
                          {/* Status icon */}
                          <div className="shrink-0">
                            {r.status === "pending" && <Clock className="text-amber-500" size={28} />}
                            {r.status === "approved" && <CheckCircle className="text-green-500" size={28} />}
                            {r.status === "rejected" && <XCircle className="text-red-400" size={28} />}
                            {r.status === "expired" && <AlertCircle className="text-gray-400" size={28} />}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-bold text-foreground">{r.buyerName}</span>
                              <span className="text-muted-foreground text-xs">{r.buyerEmail}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                r.status === "pending" ? "bg-amber-100 text-amber-700" :
                                r.status === "approved" ? "bg-green-100 text-green-700" :
                                r.status === "rejected" ? "bg-red-100 text-red-600" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {r.status}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>
                                <span className="font-semibold text-foreground">{r.packageName}</span>
                                <span className="mx-2">·</span>
                                <span className="font-bold text-accent">${r.amount?.toFixed(2)}</span>
                                <span className="mx-2">·</span>
                                <span>{new Date(r.timestamp).toLocaleString()}</span>
                              </div>
                              {r.expiresAt && (
                                <div className="text-xs">
                                  <span>⏳ Expires: {new Date(r.expiresAt).toLocaleString()}</span>
                                  {isOverdue && (
                                    <span className="text-red-500 font-extrabold ml-2">OVERDUE</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions — only for pending */}
                          {r.status === "pending" && (
                            <div className="flex gap-2 shrink-0">
                              <Button
                                onClick={() => handleRejectReservation(r)}
                                disabled={processingReservationId === r.id}
                                variant="outline"
                                className="h-10 px-4 rounded-xl text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                              >
                                {processingReservationId === r.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={14} />}
                                Reject
                              </Button>
                              <Button
                                onClick={() => handleApproveReservation(r)}
                                disabled={processingReservationId === r.id}
                                className="h-10 px-4 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
                              >
                                {processingReservationId === r.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                                Approve
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}

                  {checkReservations.filter(r => checkReservationsFilter === "all" ? true : r.status === checkReservationsFilter).length === 0 && (
                    <div className="text-center py-20 border border-dashed border-border bg-white rounded-3xl">
                      <Clock className="mx-auto mb-3 text-muted-foreground/40" size={40} />
                      <p className="text-muted-foreground font-medium">
                        {checkReservationsFilter === "pending" ? "No pending check reservations." : `No ${checkReservationsFilter} reservations found.`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

          /* ── RAFFLE MANAGER TAB ── */
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              {(() => {
                const soldItems = raffleItems.filter(i => i.status === "approved");
                const totalBoxesSold = soldItems.reduce((acc, i) => acc + i.numbers.length, 0);
                const totalRevenue = soldItems.reduce((acc, i) => acc + i.amount, 0);

                const cardOrders = raffleItems.filter(i => i.paymentMethod === "card" && i.status === "approved");
                const cardRevenue = cardOrders.reduce((acc, i) => acc + i.amount, 0);
                const cardBoxes = cardOrders.reduce((acc, i) => acc + i.numbers.length, 0);

                const checkApproved = raffleItems.filter(i => i.paymentMethod === "check" && i.status === "approved");
                const checkApprovedRev = checkApproved.reduce((acc, i) => acc + i.amount, 0);

                const checkPending = raffleItems.filter(i => i.paymentMethod === "check" && i.status === "pending");
                const checkPendingRev = checkPending.reduce((acc, i) => acc + i.amount, 0);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Revenue Card */}
                    <div className="bg-white border border-border rounded-3xl p-5 shadow-sm space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
                        <span>Total Revenue</span>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <DollarSign size={18} />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-display text-foreground">
                        ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs text-muted-foreground">From confirmed card & check sales</p>
                    </div>

                    {/* Boxes Sold Card */}
                    <div className="bg-white border border-border rounded-3xl p-5 shadow-sm space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
                        <span>Boxes Sold</span>
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Ticket size={18} />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-display text-foreground">{totalBoxesSold} <span className="text-sm font-normal text-muted-foreground">/ 144</span></div>
                      <p className="text-xs text-muted-foreground">{144 - totalBoxesSold} box numbers available</p>
                    </div>

                    {/* Card Payments Breakdown */}
                    <div className="bg-white border border-border rounded-3xl p-5 shadow-sm space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
                        <span>Card Payments</span>
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <CreditCard size={18} />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-display text-foreground">
                        ${cardRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs text-muted-foreground">{cardOrders.length} order(s) · {cardBoxes} box(es)</p>
                    </div>

                    {/* Check Payments Breakdown */}
                    <div className="bg-white border border-border rounded-3xl p-5 shadow-sm space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
                        <span>Check Reservations</span>
                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Clock size={18} />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-display text-foreground">
                        ${checkApprovedRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs text-amber-700 font-medium">
                        Pending: {checkPending.length} order(s) (${checkPendingRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Search & Filter Header Bar */}
              <div className="bg-white border border-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-display text-foreground">Raffle Number Reservations</h3>
                  <p className="text-sm text-muted-foreground">
                    Search by box number or buyer details. Review credit card purchases and manage pending check reservations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {/* Search box input */}
                  <div className="relative min-w-[200px] sm:min-w-[240px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                      type="text"
                      placeholder="Search box #, name, email..."
                      value={raffleSearch}
                      onChange={(e) => setRaffleSearch(e.target.value)}
                      className="pl-9 bg-surface border-border rounded-xl h-10 text-sm font-medium focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                    {raffleSearch && (
                      <button onClick={() => setRaffleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter select */}
                  <select
                    value={raffleFilter}
                    onChange={(e) => setRaffleFilter(e.target.value as any)}
                    className="bg-surface border-border rounded-xl px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none font-medium text-foreground h-10"
                  >
                    <option value="all">All Records</option>
                    <option value="pending">Pending Check</option>
                    <option value="approved">Paid / Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                  </select>

                  <Button onClick={fetchRaffleItems} variant="outline" className="rounded-xl h-10 px-4 text-sm font-bold flex items-center gap-1.5">
                    <RefreshCw size={14} className={raffleLoading ? "animate-spin" : ""} /> Refresh
                  </Button>

                  <Button
                    onClick={handleRaffleReset}
                    disabled={raffleResetting}
                    variant="outline"
                    className="rounded-xl h-10 px-4 text-sm font-bold flex items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400"
                  >
                    {raffleResetting
                      ? <Loader2 size={14} className="animate-spin" />
                      : <RotateCcw size={14} />
                    }
                    Reset Raffle
                  </Button>
                </div>
              </div>

              {/* Records List / Table */}
              {raffleLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" size={40} /></div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const filtered = raffleItems.filter((item) => {
                      if (raffleFilter !== "all" && item.status !== raffleFilter) return false;
                      if (!raffleSearch.trim()) return true;

                      const q = raffleSearch.toLowerCase().trim();
                      const cleanBox = q.replace(/^#/, "");
                      const matchesBox = item.numbers.some((num) => num.toString() === cleanBox);
                      const matchesName = item.buyerName.toLowerCase().includes(q);
                      const matchesEmail = item.buyerEmail.toLowerCase().includes(q);
                      const matchesPhone = item.buyerPhone?.toLowerCase().includes(q);

                      return matchesBox || matchesName || matchesEmail || matchesPhone;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-20 border border-dashed border-border bg-white rounded-3xl">
                          <Ticket className="mx-auto mb-3 text-muted-foreground/40" size={40} />
                          <p className="text-muted-foreground font-medium">
                            {raffleSearch ? `No raffle records found matching "${raffleSearch}".` : "No raffle records found."}
                          </p>
                        </div>
                      );
                    }

                    return filtered.map((item) => {
                      const isOverdue = item.status === "pending" && item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now();
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                            item.status === "pending" ? "border-amber-200 bg-amber-50/20" :
                            item.status === "approved" ? "border-emerald-200 bg-emerald-50/20" :
                            item.status === "rejected" ? "border-red-200 bg-red-50/20 opacity-75" :
                            "border-gray-200 bg-gray-50/50 opacity-60"
                          }`}
                        >
                          {/* Box Numbers Badges */}
                          <div className="shrink-0 flex sm:flex-col items-center justify-center gap-1 min-w-[90px]">
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {item.numbers.slice().sort((a, b) => a - b).map((n) => (
                                <span key={n} className="px-2.5 py-1 rounded-full text-xs font-black bg-primary text-primary-foreground shadow-sm">
                                  #{n}
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                              {item.numbers.length} {item.numbers.length === 1 ? "Box" : "Boxes"}
                            </span>
                          </div>

                          {/* Buyer & Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-bold text-foreground">{item.buyerName}</span>
                              <span className="text-muted-foreground text-xs">{item.buyerEmail}</span>
                              {item.buyerPhone && (
                                <span className="text-muted-foreground text-xs">· {item.buyerPhone}</span>
                              )}
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                item.paymentMethod === "card"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {item.paymentMethod === "card" ? "Credit Card" : "Check"}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                item.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                                item.status === "pending" ? "bg-amber-100 text-amber-800" :
                                item.status === "rejected" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-700"
                              }`}>
                                {item.status === "approved" ? "Paid / Approved" : item.status}
                              </span>
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>
                                <span className="font-bold text-accent">
                                  ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="mx-2">·</span>
                                <span>{new Date(item.timestamp).toLocaleString()}</span>
                              </div>
                              {item.expiresAt && item.status === "pending" && (
                                <div className="text-xs text-amber-700 font-medium">
                                  ⏳ Expires: {new Date(item.expiresAt).toLocaleString()}
                                  {isOverdue && <span className="text-red-500 font-extrabold ml-2">OVERDUE</span>}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions — for pending check reservations */}
                          {item.paymentMethod === "check" && item.status === "pending" && item.rawReservation && (
                            <div className="flex gap-2 shrink-0">
                              <Button
                                onClick={() => handleRejectReservation(item.rawReservation!)}
                                disabled={processingReservationId === item.id}
                                variant="outline"
                                className="h-10 px-4 rounded-xl text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                              >
                                {processingReservationId === item.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={14} />}
                                Reject
                              </Button>
                              <Button
                                onClick={() => handleApproveReservation(item.rawReservation!)}
                                disabled={processingReservationId === item.id}
                                className="h-10 px-4 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
                              >
                                {processingReservationId === item.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                                Approve
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default Admin;
