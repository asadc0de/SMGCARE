import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Heart, DollarSign, Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import heroFallback from "@/assets/hero-bg.png";

// Simple fallback for static routes so it doesn't break if they click a dummy event
const staticEvents: any = {
  "static-2026": { year: "2026", title: "Annual Charity Golf Outing", raised: "TBD", body: "Join us on Month Day, Year for our annual outing — a day of community, competition, and impact.", eventDate: "Monday September 28th 2026", location: "The Muttontown Club", charityPartner: "TBD", image: heroFallback, tag: "Upcoming" },
  "static-2025": { year: "2025", title: "Annual Charity Golf Outing", raised: "$171,215.25", body: "SMG Cares proudly hosted its 2025 Charity Golf Outing at The Muttontown Club...", eventDate: "TBD", location: "The Muttontown Club", charityPartner: "Fight CRC", image: heroFallback, tag: "Past Event" },
  "static-2024": { year: "2024", title: "Community Holiday Drive", raised: "$167,653.37", body: "The 2024 SMG Cares Charity Golf Outing, held at The Muttontown Club, was another outstanding success...", eventDate: "TBD", location: "The Muttontown Club", charityPartner: "Fight CRC", image: heroFallback, tag: "Past Event" },
  "static-2023": { year: "2023", title: "Inaugural Charity Golf Outing", raised: "$103,225", body: "In 2023, SMG Cares proudly launched its inaugural Charity Golf Outing...", eventDate: "TBD", location: "Cold Spring Country Club", charityPartner: "ROAR", image: heroFallback, tag: "Past Event" }
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      if (id.startsWith("static-")) {
        setEvent(staticEvents[id]);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "events", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("No such event found!");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <PageShell>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="animate-spin text-accent w-12 h-12" />
        </div>
      </PageShell>
    );
  }

  if (!event) {
    return (
      <PageShell>
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
          <h1 className="font-display text-5xl text-primary mb-4">Event Not Found</h1>
          <p className="text-muted-foreground text-lg mb-8">The event you are looking for does not exist or has been removed.</p>
          <Button asChild className="rounded-full">
            <Link to="/events"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Events</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const isUpcoming = event.year === "2026" || event.tag?.toLowerCase().includes("upcoming");

  return (
    <PageShell>
      {/* Agency-Level Cinematic Hero */}
      <div className="relative w-full h-[70vh] min-h-[650px] flex items-end justify-start overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src={event.image || heroFallback} 
            alt={event.title} 
            className="w-full h-full object-cover scale-105 animate-image-pan"
          />
          {/* Gradients for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
        </div>

        {/* Hero Content Overlaid on Image */}
        <div className="container-x relative z-10 w-full pb-16 md:pb-24">
          <Link to="/events" className="inline-flex items-center text-white/80 hover:text-white font-bold text-xs uppercase tracking-widest mb-10 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
          </Link>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex flex-col justify-between gap-8">
              <div className="max-w-4xl">
                <div className="flex items-center gap-4 mb-4">
                  <span className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold uppercase tracking-widest text-[10px]">
                    {event.tag || "Event"}
                  </span>
                  <span className="font-display text-3xl md:text-4xl text-white/90">{event.year}</span>
                </div>
                
                <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-white leading-[0.95] tracking-tight">
                  {event.title}
                </h1>
              </div>

              <div className="shrink-0 mb-2">
                <Button asChild size="lg" className="rounded-full bg-gradient-gold text-accent-foreground hover:scale-105 shadow-gold px-12 h-14 md:h-16 font-black text-lg transition-transform">
                  <Link to={isUpcoming ? "/golf" : "/golf-register?scroll=true"}>
                    {isUpcoming ? "Register Now" : "Donate Now"}
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Clean White Content Section */}
      <div className="bg-background pt-16 pb-24">
        <div className="container-x max-w-5xl">
          
          {/* Horizontal Meta Strip */}
          <div className="flex flex-col lg:flex-row gap-6 mb-16 items-stretch">
            {event.raised && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                <div className="h-full flex items-center gap-4 bg-blue-50/50 text-[#1E63D1] px-8 py-5 rounded-[2rem] border border-blue-100 shadow-sm min-w-[260px]">
                  <DollarSign className="w-8 h-8 shrink-0" />
                  <div>
                    <span className="block text-xs uppercase tracking-widest font-bold opacity-80 mb-1">Total Raised</span>
                    <span className="block font-display text-3xl italic leading-none">{event.raised}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {event.eventDate && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex-1">
                <div className="h-full bg-surface rounded-3xl p-6 border border-border shadow-sm">
                  <Calendar className="w-6 h-6 text-[#1E63D1] mb-4" />
                  <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Date</p>
                  <p className="text-primary font-medium text-base">{event.eventDate}</p>
                </div>
              </motion.div>
            )}
            
            {event.location && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex-1">
                <div className="h-full bg-surface rounded-3xl p-6 border border-border shadow-sm">
                  <MapPin className="w-6 h-6 text-[#1E63D1] mb-4" />
                  <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Location</p>
                  <p className="text-primary font-medium text-base">{event.location}</p>
                </div>
              </motion.div>
            )}
            
            {event.charityPartner && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="flex-1">
                <div className="h-full bg-surface rounded-3xl p-6 border border-border shadow-sm">
                  <Heart className="w-6 h-6 text-[#1E63D1] mb-4" />
                  <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Charity Partner</p>
                  <p className="text-primary font-medium text-base">{event.charityPartner}</p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="grid lg:grid-cols-12 gap-12 lg:gap-24">
            {/* Clean Body Text with Editorial Drop Cap */}
            <div className="lg:col-span-8">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="prose prose-lg md:prose-xl max-w-none text-muted-foreground mb-16">
                <p className="leading-relaxed whitespace-pre-wrap">
                  {event.body}
                </p>
              </motion.div>
            </div>

            {/* Right Sidebar CTA & Share */}
            <div className="lg:col-span-4">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="sticky top-32 bg-surface p-8 rounded-[2rem] border border-border shadow-sm">
                <h3 className="font-display text-2xl text-primary mb-4">Support the Mission</h3>
                <p className="text-sm text-muted-foreground mb-8">
                  Your contribution goes directly towards funding initiatives that change lives. Join us in making a difference.
                </p>
                <Button asChild className="w-full rounded-2xl bg-[#1E63D1] hover:bg-[#154b9f] text-white h-14 shadow-md font-medium text-lg mb-6">
                  <Link to={isUpcoming ? "/golf" : "/golf-register?scroll=true"}>
                    {isUpcoming ? "Register Now" : "Make a Donation"}
                  </Link>
                </Button>
               
              </motion.div>
            </div>
          </div>

          {/* Enhanced Animated Gallery */}
          {event.gallery && event.gallery.length > 0 && (
            <div className="mt-24">
              <div className="text-center mb-12">
                <span className="text-xs uppercase tracking-widest font-bold text-accent mb-2 block">Moments</span>
                <h3 className="font-display text-4xl md:text-5xl text-primary">Event Gallery</h3>
              </div>
              <motion.div 
                initial="hidden" 
                whileInView="visible" 
                viewport={{ once: true, margin: "-100px" }}
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.1 } }
                }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[150px] md:auto-rows-[250px]"
              >
                {event.gallery.map((img: string, idx: number) => {
                  const mod = idx % 8;
                  let gridClass = "col-span-1 row-span-1";
                  if (mod === 0) gridClass = "col-span-2 row-span-2";
                  else if (mod === 3) gridClass = "col-span-2 row-span-1";
                  else if (mod === 4) gridClass = "col-span-2 row-span-2";
                  else if (mod === 5) gridClass = "col-span-2 row-span-1";

                  return (
                    <motion.div 
                      key={idx} 
                      variants={{
                        hidden: { opacity: 0, y: 30, scale: 0.95 },
                        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
                      }}
                      className={`rounded-[2rem] overflow-hidden bg-surface border border-border/50 group relative shadow-sm ${gridClass}`}
                    >
                      <img 
                        src={img} 
                        alt={`Gallery image ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                        loading="lazy" 
                      />
                      <div className="absolute inset-0 bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay pointer-events-none" />
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}

        </div>
      </div>
    </PageShell>
  );
};

export default EventDetail;
