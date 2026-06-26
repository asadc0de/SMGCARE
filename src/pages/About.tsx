import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { PageShell } from "@/components/PageShell";

import golfOutingImg from "@/assets/golf-outing.png";
import dinnerImg from "@/assets/dinner.png";
import img1 from "@/assets/img1.jpg";
import img2 from "@/assets/img2.jpg";
import img3 from "@/assets/img3.jpg";
import img4 from "@/assets/img4.jpg";
import img5 from "@/assets/img5.jpg";
import img6 from "@/assets/img6.jpg";




const boardMembers = [
  { fullName: "Wesley Melchiorre", title: "Board Chair" },
  { fullName: "Gregory Scotto", title: "Vice Chair" },
  { fullName: "David Isaacs", title: "Board Treasurer" },
  { fullName: "Marc Valente", title: "Board Secretary" },
  { fullName: "Kinshuk Sharma", title: "Board Member" },
  { fullName: "Danielle Hoering", title: "Board Member" },
];

const About = () => {
  return (
    <PageShell>
      <section className="relative pt-24 pb-20 md:pt-36 md:pb-32 bg-primary text-primary-foreground overflow-hidden">
        {/* Massive Brand Watermark Behind Text */}
        <div className="absolute top-20 -left-20 pointer-events-none select-none opacity-[0.03] rotate-[-15deg]">
          <h2 className="font-display text-[25vw] leading-none tracking-tighter whitespace-nowrap">
            GIVING BACK
          </h2>
        </div>

        {/* Cinematic Background Elements */}
        <div className="absolute inset-0 floral-pattern opacity-[0.05]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/90 to-primary" />

        {/* Dynamic Glows */}
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-accent-soft/5 rounded-full blur-[120px]" />

        <div className="container-x relative">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-5">
                <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-soft">Mission First Foundation</span>
              </div>

              <h1 className="font-display text-7xl sm:text-5xl md:text-6xl leading-[0.85] tracking-tighter mb-10">
                We exist to<br /><span className="italic text-[#72a8ff]">give back.</span>
              </h1>

              <p className="max-w-xl text-base md:text-lg text-primary-foreground/70 leading-relaxed font-medium mb-12">
                SMG Cares is the dedicated charitable arm of SMG ABA LLC — a foundation built on the belief that a thriving business has a responsibility to lift up the people, families, and communities around it.
              </p>

              {/* Statistics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 pt-12 border-t border-white/5">
                {[
                  { label: "Community", value: "Local" },
                  { label: "Commitment", value: "Annual" },
                  { label: "Focus", value: "Impact" }
                ].map((s, i) => (
                  <div key={i}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1">{s.label}</p>
                    <p className="font-display text-2xl text-accent-soft">{s.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex justify-center items-center mt-16 lg:mt-0"
            >
              {/* Multi-layered Image Stack */}
              <div className="relative w-[75%] sm:w-[85%] lg:w-full max-w-[450px] mx-auto mt-8 sm:mt-12 lg:mt-0">
                <div className="relative z-10 w-full aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-white/10 transform hover:scale-[1.02] transition-transform duration-700">
                  <img src={golfOutingImg} alt="Charity Outing" className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-[2000ms]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
                </div>

                {/* Secondary Floating Card */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-6 -left-8 sm:-bottom-8 sm:-left-12 z-20 w-32 sm:w-40 lg:w-48 aspect-square rounded-[1.5rem] overflow-hidden shadow-2xl border border-white/10"
                >
                  <img src={dinnerImg} alt="Community Dinner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                </motion.div>

                {/* Floating Glass Tag */}
                <div className="absolute -top-8 -right-4 sm:-top-10 sm:-right-8 lg:right-10 z-20 glass-capsule px-4 py-2 sm:px-6 sm:py-4 border-white/20 shadow-2xl animate-float rounded-full scale-75 sm:scale-100 origin-bottom-right">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold">
                      <Sparkles className="text-accent-foreground" size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-none mb-1">Backed By</p>
                      <p className="text-sm font-black text-white leading-none">SMG ABA LLC</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>

      </section>

      <section className="container-x py-16 md:py-28 grid lg:grid-cols-12 gap-8 md:gap-12">
        <div className="lg:col-span-5">
          <span className="eyebrow">Our Story</span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl text-primary leading-[1.05]">A foundation built on <span className="italic text-[#72a8ff]">purpose.</span></h2>
          <div className="mt-8 pt-8 border-t border-border/50">
            <span className="eyebrow">Headquarters</span>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              300 Corporate Plaza<br />
              Islandia NY 11749
            </p>
          </div>
        </div>
        <div className="lg:col-span-7 space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>What started as a simple commitment to give back has grown into a structured effort to channel generosity where it matters most. Every initiative we undertake reflects our belief that small acts, multiplied by many, change the world.</p>
          <p>From our annual golf fundraiser to year-round community partnerships, SMG Cares mobilizes resources, time, and care into outcomes that families and organizations can feel.</p>
          <p>We are donors, volunteers, and neighbors. We are SMG Cares.</p>
        </div>
      </section>

      <section className="container-x py-16 md:py-28">
        <div className="mb-16 max-w-3xl mx-auto text-center">
          <span className="eyebrow">Our Team</span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl text-primary leading-[1.05]">Meet the <span className="italic text-[#72a8ff]">board.</span></h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto px-4 pb-12 justify-items-center">
          {boardMembers.map((m, i) => (
            <div key={m.fullName + i} className="flex flex-col items-center justify-center text-center bg-white border border-border/50 shadow-sm rounded-2xl p-6 hover-lift w-full max-w-[240px] min-h-[140px] mx-auto">
              <p className="text-[10px] uppercase tracking-widest text-accent font-bold mb-3 text-center">{m.title}</p>
              <h3 className="font-display text-2xl text-primary leading-snug text-center w-full">{m.fullName}</h3>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
};

export default About;
