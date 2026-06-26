import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Image as ImageIcon, Save, X, Loader2, Trophy, Infinity as InfinityIcon, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, setDoc, increment, where } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, firebaseIsConfigured } from "@/lib/firebase";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LogOut, Lock, Eye, EyeOff } from "lucide-react";
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
  amount: number;
  status: "pending" | "approved" | "rejected" | "expired";
  paymentMethod: "check";
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
  const [activeAdminTab, setActiveAdminTab] = useState<"events" | "sponsorships" | "purchases" | "checkReservations">("events");
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [sponsorshipsLoading, setSponsorshipsLoading] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesFilter, setPurchasesFilter] = useState<"All" | "Success" | "Failed">("All");
  const [purchasesSort, setPurchasesSort] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [savingSponsorId, setSavingSponsorId] = useState<string | null>(null);
  const [mutatingSponsorId, setMutatingSponsorId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showAddSponsorshipForm, setShowAddSponsorshipForm] = useState(false);
  const [checkReservations, setCheckReservations] = useState<CheckReservation[]>([]);
  const [checkReservationsLoading, setCheckReservationsLoading] = useState(false);
  const [checkReservationsFilter, setCheckReservationsFilter] = useState<"all" | "pending" | "approved" | "rejected" | "expired">("pending");
  const [processingReservationId, setProcessingReservationId] = useState<string | null>(null);
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
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
      if (isSponsorship) {
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
      if (isSponsorship) {
        const sponsorRef = doc(db, "sponsorships", reservation.sponsorshipId);
        await updateDoc(sponsorRef, {
          reservedCount: increment(-1),
        });
      }

      toast.success("Reservation rejected. Spot freed.");
      fetchCheckReservations();
      fetchSponsorships();
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
          if (isSponsorship) {
            await updateDoc(doc(db, "sponsorships", data.sponsorshipId), {
              reservedCount: increment(-1),
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

  const tabTitle = {
    events: "Event Manager",
    sponsorships: "Sponsorship Manager",
    purchases: "Purchase History",
    checkReservations: "Check Reservations",
  }[activeAdminTab];

  const tabDesc = {
    events: "Manage your foundation's impact and upcoming events.",
    sponsorships: "Track and adjust real-time sponsorship availability, claims, and limits.",
    purchases: "View a read-only log of all successful and failed payment attempts.",
    checkReservations: "Review and approve or reject pending check payment reservations.",
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
            </div>

          /* ── PURCHASES TAB ── */
          ) : activeAdminTab === "purchases" ? (
            <div className="space-y-6">
              <div className="bg-white border border-border rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-display text-foreground">Purchases Log</h3>
                  <p className="text-sm text-muted-foreground">View all successful and failed payment attempts.</p>
                </div>
                <select value={purchasesFilter} onChange={(e) => setPurchasesFilter(e.target.value as any)}
                  className="bg-surface border-border rounded-xl px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none font-medium text-foreground">
                  <option value="All">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
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
                        {purchases
                          .filter(p => purchasesFilter === "All" ? true : purchasesFilter === "Success" ? p.paymentStatus === "success" : p.paymentStatus === "failed")
                          .sort((a, b) => {
                            if (purchasesSort === "date_desc") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                            if (purchasesSort === "date_asc") return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                            if (purchasesSort === "amount_desc") return b.amount - a.amount;
                            if (purchasesSort === "amount_asc") return a.amount - b.amount;
                            return 0;
                          })
                          .map((p) => (
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
                        {purchases.length === 0 && (
                          <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">No purchases found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          /* ── CHECK RESERVATIONS TAB ── */
          ) : (
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
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default Admin;
