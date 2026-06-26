import { motion } from "framer-motion";
import { Camera, Image as ImageIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";

import img1 from "@/assets/Gallery pages images/A7R00958.jpg";
import img2 from "@/assets/Gallery pages images/IMG_2743.jpg";
import img3 from "@/assets/Gallery pages images/IMG_2794.jpg";
import img4 from "@/assets/Gallery pages images/IMG_3040.jpg";
import img5 from "@/assets/Gallery pages images/_JP_0067.jpg";
import img6 from "@/assets/Gallery pages images/_JP_3925.jpg";
import img7 from "@/assets/Gallery pages images/_JP_4444.jpg";
import img8 from "@/assets/Gallery pages images/_JP_9329.jpg";
import img9 from "@/assets/Gallery pages images/_JP_9743.jpg";

const photos = [img1, img2, img3, img4, img5, img6, img7, img8, img9];

const Gallery = () => {
  return (
    <PageShell>
      <section className="relative pt-24 pb-20 md:pt-36 md:pb-32 bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute top-20 -left-20 pointer-events-none select-none opacity-[0.03] rotate-[-15deg]">
          <h2 className="font-display text-[25vw] leading-none tracking-tighter whitespace-nowrap">THE LENS</h2>
        </div>
        <div className="absolute inset-0 floral-pattern opacity-[0.05]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/80 to-primary" />
        <div className="container-x relative pb-32">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
                <Camera className="text-accent" size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-soft">Visual Archive</span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl lg:text-[7rem] leading-[0.8] tracking-tighter mb-10">
                Through <br /> the &nbsp;<span className="italic text-[#72a8ff]">lens.</span>
              </h1>
              <p className="max-w-xl text-lg md:text-xl text-primary-foreground/70 leading-relaxed font-medium">
                Capturing the moments of generosity, connection, and impact that define SMG Cares. Every frame is a testament to community.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, delay: 0.2 }} className="relative hidden lg:flex justify-center">
              <div className="relative w-full max-w-[400px] aspect-square">
                <div className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full animate-[spin_60s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 rounded-[4rem] bg-gradient-navy border border-white/10 shadow-2xl flex flex-col items-center justify-center p-8 text-center rotate-3">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-gold flex items-center justify-center shadow-gold mb-6">
                      <ImageIcon className="text-accent-foreground" size={28} />
                    </div>
                    <h3 className="font-display text-3xl text-white mb-2">Capturing Good</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-soft">2023 – Present</p>
                  </div>
                </div>
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-10 -right-4 w-40 aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/20 rotate-12">
                  <img src={img1} alt="" className="w-full h-full object-cover" />
                </motion.div>
                <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-10 -left-4 w-44 aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-white/20 -rotate-12">
                  <img src={img5} alt="" className="w-full h-full object-cover" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      <section className="container-x py-12 md:py-20">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [&>*]:mb-6">
          {photos.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: (i % 3) * 0.1 }}
              className={`group overflow-hidden rounded-3xl break-inside-avoid relative ${i % 5 === 0 ? "aspect-[3/4]" : i % 3 === 0 ? "aspect-square" : "aspect-[4/5]"}`}>
              <img src={p} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </section>
    </PageShell>
  );
};

export default Gallery;
