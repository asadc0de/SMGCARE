import { useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/ContactDialog";

const Donate = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
  <PageShell>
    <section className="relative pt-40 pb-32 md:pt-64 md:pb-56 bg-primary text-primary-foreground min-h-[100svh] flex items-center overflow-hidden">
      {/* Massive Brand Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03]">
        <h2 className="font-display text-[45vw] leading-none tracking-tighter uppercase">
          Impact
        </h2>
      </div>

      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 floral-pattern opacity-[0.05]" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/80 to-primary" />
      
      {/* Dynamic Light Leaks */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[160px] pointer-events-none animate-pulse" />
      
      <div className="container-x relative text-center flex flex-col items-center">
        {/* Pulsing Heart Badge */}
        <motion.div 
          initial={{ scale: 0, rotate: -45 }} 
          animate={{ scale: 1, rotate: 0 }} 
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-12 group"
        >
          <div className="absolute -inset-4 bg-accent/20 rounded-[2.5rem] blur-2xl group-hover:bg-accent/40 transition-colors" />
          <div className="relative w-28 h-28 rounded-[2.5rem] bg-gradient-gold flex items-center justify-center shadow-gold overflow-hidden">
            <Heart className="w-14 h-14 text-accent-foreground relative z-10" fill="currentColor" />
            <motion.div 
              animate={{ y: ["100%", "-100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-white/20 skew-y-12"
            />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-10">
            <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-soft">Support Our Mission</span>
          </div>

          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-[11rem] leading-[0.75] tracking-tighter mb-12">
            Your gift,<br /><span className="italic gold-text">their tomorrow.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-2xl text-primary-foreground/70 leading-relaxed font-medium mb-12">
            Our secure donation portal is being prepared. Once our merchant processor is finalized, you'll be able to fuel impact directly here. In the meantime, thank you for standing with us.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-5">
            <Button 
              onClick={() => setContactOpen(true)}
              size="lg" 
              className="w-full sm:w-auto bg-gradient-gold text-accent-foreground rounded-full px-8 md:px-14 py-4 h-14 md:h-18 text-lg md:text-xl font-black shadow-gold hover:scale-105 transition-transform"
            >
              Contact us to give
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/5 border-white/20 text-white backdrop-blur-md hover:bg-white/10 rounded-full px-8 md:px-14 h-14 md:h-18 text-lg md:text-xl font-black transition-all">
              Learn More
            </Button>
          </div>
          
          <div className="mt-16 flex items-center justify-center gap-4 opacity-40">
            <div className="h-px w-8 bg-white" />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Coming Soon · Secure Giving</p>
            <div className="h-px w-8 bg-white" />
          </div>
        </motion.div>
      </div>

     
    </section>
    <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
  </PageShell>
);
};

export default Donate;
