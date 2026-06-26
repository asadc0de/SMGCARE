import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  HandHeart,
  Users,
  Sparkles,
  HeartHandshake,
  Search,
  Heart,
  LifeBuoy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Target,
  Eye,
  Zap,
  ShieldCheck,
  Handshake,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";

import { RotatingWords } from "@/components/RotatingWords";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/ContactDialog";
import { CustomDonationModal } from "@/components/CustomDonationModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import heroImg from "@/assets/hero-bg.png";
import img1 from "@/assets/Gallery pages images/A7R00958.jpg";
import img2 from "@/assets/Gallery pages images/_JP_0067.jpg";
import img3 from "@/assets/Gallery pages images/_JP_4444.jpg";
import img4 from "@/assets/Gallery pages images/_JP_9743.jpg";
import golfOutingImg from "@/assets/golf-outing.png";
import dinnerImg from "@/assets/dinner.png";
import smgLogo from "@/assets/logo.webp";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const initialEventsData = [
  {
    id: "static-2026",
    year: "2026",
    tag: "Upcoming",
    title: "Annual Charity Golf Outing",
    body: "SMG Cares proudly announces our 2026 Charity Golf Outing at The Muttontown Club September 28th, 2026. We once again are bringing together an incredible community of supporters, partners, and participants for a meaningful day on the course.",
    cta: "Register Now",
    to: "/golf",
    image: golfOutingImg,
  },
  {
    id: "static-2025",
    year: "2025",
    tag: "Past Event",
    title: "Annual Charity Golf Outing",
    body: "A successful event raising $XXX,XXX for Charity Name — thank you to every participant and sponsor.",
    cta: "View Event",
    to: "/events/static-2025",
    image: dinnerImg,
    secondary: true,
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as any },
  },
};

const Index = () => {
  const [contact, setContact] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [eventsData, setEventsData] = useState(initialEventsData);
  const carouselImages = [img1, img2, img3, img4];
  const coreValuesCards = [
    {
      title: "Compassion",
      description: "Serving others with empathy, dignity, and respect.",
      letter: "C",
      icon: HandHeart,
      tint: "bg-gradient-to-br from-[#eff6ff] via-[#f8fbff] to-[#ffffff]",
      iconTint: "bg-white text-[#1a3052]",
      letterTint: "text-[#1A60D0]",
    },
    {
      title: "Action",
      description:
        "Responding to community needs through meaningful outreach and engagement.",
      letter: "A",
      icon: Zap,
      tint: "bg-gradient-to-br from-[#f8fbff] via-[#edf4fb] to-[#ffffff]",
      iconTint: "bg-white text-[#1c61d1]",
      letterTint: "text-[#1a3052]",
    },
    {
      title: "Resilience",
      description: "Encouraging strength, perseverance, and long-term growth.",
      letter: "R",
      icon: ShieldCheck,
      tint: "bg-gradient-to-br from-[#eff6ff] via-[#f7fbff] to-[#ffffff]",
      iconTint: "bg-white text-[#1a3052]",
      letterTint: "text-[#1A60D0]",
    },
    {
      title: "Empowerment",
      description:
        "Equipping individuals and families with tools and opportunities for success.",
      letter: "E",
      icon: Users,
      tint: "bg-gradient-to-br from-[#f6faff] via-[#edf5fd] to-[#ffffff]",
      iconTint: "bg-white text-[#1a3052]",
      letterTint: "text-[#1a3052]",
    },
    {
      title: "Service",
      description:
        "Creating lasting impact through collaboration and community support.",
      letter: "S",
      icon: Handshake,
      tint: "bg-gradient-to-br from-[#f7fbff] via-[#edf4fb] to-[#f9fcff]",
      iconTint: "bg-white text-[#1c61d1]",
      letterTint: "text-[#1A60D0]",
    },
  ];

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const fetchedEvents = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as any[];
          // Merge fetched events with initial static events
          setEventsData([...fetchedEvents, ...initialEventsData]);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  return (
    <PageShell>
      {/* HERO: Cinematic Signature Layout */}
      <section className="relative hero-section min-h-[100svh] flex items-center justify-center overflow-hidden bg-[#1a3052]">
        <img
          src={heroImg}
          alt=""
          fetchpriority="high"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
        />
        <div className="absolute inset-0 " />

        {/* Brand Layers & Cinematic Filters */}
        <div className="absolute inset-0 floral-pattern opacity-[0.25] mix-blend-overlay" />

        <div className="container-x relative pt-32 pb-20 text-center z-10">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.15 } } }}
            className="max-w-4xl mx-auto flex flex-col items-center"
          >
            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-[7.5rem] leading-[0.95] tracking-tighter text-white mb-6 text-balance"
            >
              Giving Back &amp; <br />
              <span className="italic text-[#72a8ff]">Changing Lives.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="max-w-3xl text-[14px] md:text-[16px] text-white/80 leading-relaxed mb-12 font-medium"
            >
              SMG Cares raises funds for charitable organizations and gives back
              to our communities. We provide financial assistance to families,
              employees, and local charities during difficult times.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-center"
            >
              {/* Card 1: Donate Now */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="group w-full sm:w-auto flex items-center gap-4 bg-[#1C61D1] rounded-[1.25rem] p-3 pr-20 border border-white/5 hover:scale-105 transition-transform shadow-lg outline-none">
                    <div className="bg-white/10 p-3 rounded-full flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-white/60">
                        Make a Donation
                      </span>
                      <span className="flex items-center text-white font-bold text-[17px] leading-tight mt-0.5">
                        Donate Now <ChevronDown className="ml-2 w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                      </span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 bg-primary text-primary-foreground border-white/10 mt-2 p-2 rounded-xl">
                  <DropdownMenuItem onClick={() => setDonationOpen(true)} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 font-medium py-3 rounded-lg">
                    Donate to SMG Cares
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer hover:bg-white/10 focus:bg-white/10 font-medium py-3 rounded-lg">
                    <Link to="/golf-register?scroll=true">2026 Charity Golf Outing</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Card 2: Register */}
              <Link
                to="/golf"
                className="group w-full sm:w-auto flex items-center gap-4 bg-white rounded-[1.25rem] p-3 pr-16 hover:scale-105 transition-transform shadow-lg text-left"
              >
                <div className="bg-[#eff3f9] p-3 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-[#1a3052]" />
                </div>
                <div className="text-left">
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#888]">
                    Annual Event
                  </span>
                  <span className="block text-[#1a3052] font-bold text-[17px] leading-tight mt-0.5">
                    Register Now
                  </span>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
        {/* Watermark (behind hero content) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <h2 className="font-display leading-none tracking-tighter text-white z-0" style={{ fontSize: '250px', opacity: 0.06 }}>
            SMG Cares
          </h2>
        </div>
      </section>

      {/* CARES - Mission, Vision, Core Values */}
      <section className="container-x py-28">
        <div className="grid gap-12 mb-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Mission Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="group relative bg-gradient-to-br from-[#1c61d1]/15 via-[#1c61d1]/8 to-[#1c61d1]/5 rounded-3xl p-8 md:p-10 overflow-hidden hover-lift"
            >
              {/* Decorative shapes - right side */}
              <div className="absolute -top-32 right-0 w-80 h-80 bg-gradient-to-br from-[#1c61d1]/15 to-[#1c61d1]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-20 right-10 w-56 h-56 bg-gradient-to-tl from-[#1c61d1]/20 to-transparent rounded-3xl blur-2xl pointer-events-none" />
              <div className="absolute top-40 right-20 w-40 h-40 bg-gradient-to-br from-[#1a3052]/10 to-[#1c61d1]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-20 right-0 w-64 h-64 bg-gradient-to-tl from-[#1c61d1]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

              {/* Custom SVG shape */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="320"
                height="320"
                fill="none"
                viewBox="0 0 256 256"
                className="absolute -right-24 top-1/2 transform -translate-y-1/2 opacity-20 pointer-events-none"
              >
                <path
                  d="M 228 0 C 172.772 0 128 44.772 128 100 L 128 0 L 0 0 L 0 28 C 0 83.228 44.772 128 100 128 L 0 128 L 0 256 L 28 256 C 83.228 256 128 211.228 128 156 L 128 256 L 256 256 L 256 228 C 256 172.772 211.228 128 156 128 L 256 128 L 256 0 Z"
                  fill="currentColor"
                  className="text-[#1c61d1]"
                ></path>
              </svg>

              <div className="relative z-10 max-w-sm">
                <h3 className="font-display text-3xl md:text-4xl text-[#1a3052] leading-tight mb-3">
                  Mission Statement
                </h3>
                <p className="text-[#1a3052]/75 leading-relaxed font-medium mb-6">
                  SMG Cares is dedicated to raising funds to support charitable
                  organizations and give back to our communities. Through the
                  generosity of our partners and donors, we provide financial
                  assistance to those in need — supporting families, employees,
                  and local charities during difficult times.
                </p>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 text-[#1c61d1] font-semibold hover:gap-3 transition-all"
                >
                  Learn More <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            {/* Vision Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.06 }}
              className="group relative bg-gradient-to-br from-[#1a3052]/15 via-[#1a3052]/8 to-[#1a3052]/5 rounded-3xl p-8 md:p-10 overflow-hidden hover-lift"
            >
              {/* Decorative shapes - right side */}
              <div className="absolute -top-32 right-0 w-80 h-80 bg-gradient-to-br from-[#1a3052]/15 to-[#1a3052]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-20 right-10 w-56 h-56 bg-gradient-to-tl from-[#1a3052]/20 to-transparent rounded-3xl blur-2xl pointer-events-none" />
              <div className="absolute top-40 right-20 w-40 h-40 bg-gradient-to-br from-[#1c61d1]/10 to-[#1a3052]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-20 right-0 w-64 h-64 bg-gradient-to-tl from-[#1a3052]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

              {/* Custom SVG shape */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="320"
                height="320"
                fill="none"
                viewBox="0 0 256 256"
                className="absolute -right-24 top-1/2 transform -translate-y-1/2 opacity-20 pointer-events-none"
              >
                <path
                  d="M 92 72 C 142.81 72 184 113.19 184 164 C 184 214.81 142.81 256 92 256 C 41.19 256 0 214.81 0 164 C 0 113.19 41.19 72 92 72 Z M 256 0 L 256 256 L 184 256 L 184 72 L 0 72 L 0 0 Z"
                  fill="currentColor"
                  className="text-[#1a3052]"
                ></path>
              </svg>

              <div className="relative z-10 max-w-sm">
                <h3 className="font-display text-3xl md:text-4xl text-[#1a3052] leading-tight mb-3">
                  Vision Statement
                </h3>
                <p className="text-[#1a3052]/75 leading-relaxed font-medium mb-6">
                  Our vision is to build stronger, healthier, and more connected
                  communities where every individual and family has access to
                  the support, resources, and opportunities needed to thrive.
                </p>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 text-[#1a3052] font-semibold hover:gap-3 transition-all"
                >
                  Learn More <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Core Values Heading */}
          <div className="text-center mt-6">
            <h3 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary mb-4">
              Core Values
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our guiding principles drive everything we do — from meaningful
              outreach to lasting impact.
            </p>
          </div>

          {/* Core Values Cards */}
          <div className="mt-8 -mx-6 md:-mx-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 2xl:gap-5">
              {coreValuesCards.map((card, i) => (
                <motion.article
                  key={card.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.65, delay: i * 0.08 }}
                  className="h-full rounded-3xl bg-white p-1.5 shadow-md mx-6 md:mx-0"
                >
                  <div
                    className={`flex h-full min-h-[255px] flex-col rounded-2xl p-4 md:p-5 ${card.tint} border border-white/90 backdrop-blur-sm`}
                  >
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <span
                        className={`text-7xl font-display leading-none select-none ${card.letterTint}`}
                      >
                        {card.letter}
                      </span>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/75 ${card.iconTint}`}
                      >
                        <card.icon
                          className="h-4.5 w-4.5"
                          strokeWidth={1.8}
                        />
                      </div>
                    </div>
                    <div className="mt-auto flex flex-col gap-3">
                      <h4 className="text-lg font-semibold text-slate-800">
                        {card.title}
                      </h4>
                      <p className="text-sm leading-relaxed text-slate-600">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>

          {/* Donate CTA */}
          <div className="mt-10 flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground rounded-full px-12 h-16 text-xl font-black hover:bg-primary-glow shadow-elegant"
            >
              <Link to="/golf-register?scroll=true">
                Donate Now <Sparkles className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* WHO WE ARE */}
      <section className="relative bg-gradient-cream py-28 overflow-hidden">
        <div className="absolute inset-0 grain pointer-events-none" />
        <div className="container-x relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="eyebrow mx-auto justify-center flex mb-2">
              Who We Are
            </span>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-primary">
              Backed by <span className="italic gold-text">SMG ABA</span> &
              partners who care.
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-6xl mx-auto aspect-[18/9] rounded-[3rem] overflow-hidden shadow-elegant mb-16 relative bg-muted/20"
          >
            <AnimatePresence>
              <motion.img
                key={currentImageIndex}
                src={carouselImages[currentImageIndex]}
                alt="Community"
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            </AnimatePresence>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-6 mb-8">
                <img src={smgLogo} alt="SMG ABA Logo" className="h-20 w-auto" />
                <div className="h-px flex-1 shimmer-line" />
              </div>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl font-medium">
                SMG Cares is supported by SMG ABA LLC and our incredible
                partners who show support annually. We collectively share a
                commitment to making a positive impact locally within our
                communities and industries.
              </p>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="mt-10 group text-primary hover:text-accent hover:bg-transparent px-0 text-lg font-black tracking-widest uppercase"
              >
                <Link to="/about">
                  Learn More
                  <ArrowUpRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Link>
              </Button>
            </div>

            <div className="lg:col-span-5 flex lg:justify-end">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-white border border-border rounded-[3rem] p-8 md:p-14 shadow-elegant w-full max-w-md relative overflow-hidden group"
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-accent/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="text-6xl md:text-9xl font-display gold-text leading-none mb-6">
                  100%
                </div>
                <p className="text-lg md:text-2xl text-primary font-black leading-tight relative z-10 uppercase tracking-tighter">
                  of donations directly fund charitable impact.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* EVENTS */}
      <section className="container-x py-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <span className="eyebrow">Events</span>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-primary leading-[1.05]">
              Moments that
              <br />
              <span className="italic gold-text">made a difference.</span>
            </h2>
          </div>
          <Link
            to="/events"
            className="text-sm font-black uppercase tracking-widest text-primary underline-grow"
          >
            View all events →
          </Link>
        </div>

        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent className="-ml-4 md:-ml-8">
            {eventsData.map((event, i) => (
              <CarouselItem key={i} className="pl-4 md:pl-8 md:basis-1/2">
                <EventCard {...event} />
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Mobile: centred arrows + dot indicators */}
          <div className="flex md:hidden items-center justify-center gap-5 mt-8">
            <CarouselPrevious className="static transform-none h-11 w-11 rounded-full bg-white border border-border shadow-md hover:scale-105 text-primary flex items-center justify-center arrow-bounce" />
            <div className="flex gap-2">
              {eventsData.map((_, i) => (
                <span
                  key={i}
                  className="block h-2 rounded-full bg-primary/20 transition-all duration-300"
                  style={{
                    width: i === 0 ? "24px" : "8px",
                    background: i === 0 ? "hsl(var(--primary))" : undefined,
                  }}
                />
              ))}
            </div>
            <CarouselNext className="static transform-none h-11 w-11 rounded-full bg-white border border-border shadow-md hover:scale-105 text-primary flex items-center justify-center arrow-bounce" />
          </div>
        </Carousel>
      </section>

      {/* CTA STRIP */}
      <section className="container-x relative mb-24">
        <div className="relative py-16 px-6 md:py-24 md:px-12 bg-primary text-primary-foreground overflow-hidden rounded-[2rem] md:rounded-[3.5rem] max-w-6xl mx-auto shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_70%_50%,hsl(var(--accent)/0.5),transparent_60%)]" />
          <div className="absolute inset-0 floral-pattern opacity-[0.05]" />
          <div className="relative text-center">
            <h2 className="font-display text-4xl md:text-7xl leading-[0.85] tracking-tighter mb-8">
              Be part of the
              <br />
              <span className="italic text-[#1E63D1]">next chapter.</span>
            </h2>
            <p className="max-w-2xl mx-auto text-primary-foreground/80 text-lg md:text-xl leading-relaxed font-medium mb-12">
              Your contribution becomes someone's turning point. Join us in the
              vital work of giving back.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-gradient-gold text-accent-foreground rounded-full px-8 md:px-16 h-14 md:h-20 text-lg md:text-2xl font-black shadow-gold hover:scale-105 transition-transform"
            >
              <Link to="/golf-register?scroll=true">
                Donate Now <ArrowRight className="ml-3 h-7 w-7" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <ContactDialog open={contact} onOpenChange={setContact} />
      <CustomDonationModal open={donationOpen} onOpenChange={setDonationOpen} />
    </PageShell>
  );
};

const EventCard = ({
  id,
  year,
  tag,
  title,
  body,
  cta,
  to,
  image,
  secondary,
}: any) => {
  const isPast = parseInt(year) < 2026 || tag?.toLowerCase().includes("past");
  const buttonText = isPast ? "Read More" : "Register Now";
  const linkTo = isPast ? (id ? `/events/${id}` : "/events") : to || "/golf";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-[#dcdcdc] border border-border rounded-3xl overflow-hidden hover-lift"
    >
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
        />
      </div>
      <div className="p-8 md:p-10">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <span>{tag}</span>
          <span className="font-display text-3xl text-accent not-italic">
            {year}
          </span>
        </div>
        <h3 className="mt-4 font-display text-2xl md:text-3xl text-primary leading-tight">
          {title}
        </h3>
        <p className="mt-3 text-muted-foreground leading-relaxed line-clamp-2">
          {body}
        </p>
        <Button
          asChild
          className={`mt-8 rounded-full ${secondary ? "bg-primary text-primary-foreground" : "bg-gradient-gold text-accent-foreground shadow-gold"}`}
        >
          <Link to={linkTo}>
            {buttonText} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default Index;
