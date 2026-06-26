import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import event2025 from "@/assets/event-2025.jpg";
import event2026 from "@/assets/event-2026.jpg";
import g1 from "@/assets/gallery-1.jpg";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";

const initialEvents: any[] = [];

const Events = () => {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const fetchedEvents = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          // Merge fetched events with initial static events
          setEvents([...fetchedEvents, ...initialEvents]);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  return (
    <PageShell>
      <section className="relative pt-40 pb-32 md:pt-64 md:pb-56 bg-primary text-primary-foreground overflow-hidden">
        {/* Massive Brand Watermark - Centered and Different */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.02]">
          <h2 className="font-display text-[45vw] leading-none tracking-tighter uppercase">
            Moments
          </h2>
        </div>

        {/* Cinematic Background Elements */}
        <div className="absolute inset-0 floral-pattern opacity-[0.05]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/80 to-primary" />

        <div className="container-x relative">
          <div className="flex flex-col items-center text-center">

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl z-10"
            >
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-12">
                <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-soft">Chronicle of Impact</span>
              </div>

              <h1 className="font-display text-7xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.85] tracking-tighter mb-12">
                A history of <br /><span className="italic text-[#72a8ff]">good.</span>
              </h1>

              <p className="max-w-2xl mx-auto text-lg md:text-2xl text-primary-foreground/70 leading-relaxed font-medium">
                A curated look back at the events, fundraisers, and community moments that defined our impact year after year. Every photo tells a story of care.
              </p>
            </motion.div>

            {/* Scattered Floating Moment Frames */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden lg:overflow-visible">
              {/* Top Left Floating Image */}
              <motion.div
                initial={{ opacity: 0, x: -150, y: 50, rotate: -15 }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: -10 }}
                transition={{ duration: 1.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-10 -left-10 w-32 sm:top-20 sm:left-10 sm:w-48 lg:w-72 aspect-square rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl border border-white/5"
              >
                <img src={event2025} alt="" className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/80 to-transparent" />
              </motion.div>

              {/* Bottom Right Floating Image */}
              <motion.div
                initial={{ opacity: 0, x: 150, y: -50, rotate: 15 }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 8 }}
                transition={{ duration: 1.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-20 -right-10 w-36 sm:bottom-40 sm:right-10 sm:w-56 lg:w-80 aspect-[4/5] rounded-[2rem] lg:rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/5"
              >
                <img src={event2026} alt="" className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-bl from-primary/80 to-transparent" />
              </motion.div>

              {/* Top Right Floating Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1.2, delay: 0.8, type: "spring" }}
                className="absolute top-32 right-4 sm:top-48 sm:right-32 glass-capsule px-4 py-3 sm:px-8 sm:py-5 border-white/20 shadow-2xl rounded-full flex items-center gap-2 sm:gap-4 animate-float scale-75 sm:scale-100 origin-top-right"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
                  <Calendar className="text-accent-foreground w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 leading-none">History</p>
                  <p className="text-base sm:text-lg font-black text-white leading-none tracking-tight">23 – 26</p>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      <section className="container-x py-24 space-y-24">
        {events.map((e, i) => {
          const currentYear = new Date().getFullYear().toString();
          const isUpcoming = e.year === currentYear || e.year > currentYear || e.tag?.toLowerCase().includes("upcoming");
          
          return (
            <motion.article key={e.year} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className={`grid lg:grid-cols-12 gap-6 md:gap-10 items-center ${i % 2 ? "lg:[&>*:first-child]:order-last" : ""}`}>
              <div className="lg:col-span-7">
                <div className="aspect-[16/10] rounded-3xl overflow-hidden shadow-elegant relative group">
                  <img src={e.image} alt={e.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  {isUpcoming && (
                    <div className="absolute top-6 left-6 z-10">
                      <span className="bg-gradient-gold text-accent-foreground font-black uppercase tracking-[0.2em] text-[11px] px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 backdrop-blur-md inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent-foreground animate-pulse" />
                        Coming Soon
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="font-display text-7xl md:text-[8rem] leading-none text-[#a6bde8]">{e.year}</div>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-primary leading-tight">{e.title}</h2>
                
                {!isUpcoming && e.raised && (
                  <p className="mt-3 text-xl md:text-2xl text-[#1E63D1] font-display italic">Raised {e.raised}</p>
                )}
                
                <p className="mt-6 text-muted-foreground leading-relaxed text-base md:text-lg line-clamp-3">{e.body}</p>
                
                <div className="mt-8">
                  {isUpcoming ? (
                    <Button asChild className="rounded-full bg-gradient-gold text-accent-foreground hover:scale-105 shadow-gold px-8 h-12 md:h-14 font-bold text-base transition-transform">
                      <Link to="/golf">
                        Register Now <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild className="rounded-full bg-[#1E63D1] text-white hover:bg-[#154b9f] shadow-md px-8 hover:scale-105 transition-transform">
                      <Link to={`/events/${e.id}`}>
                        Read about the event <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </section>
    </PageShell>
  );
};

export default Events;
