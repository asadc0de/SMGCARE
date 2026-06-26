import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const RotatingWords = ({ words, className = "" }: { words: string[]; className?: string }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(p => (p + 1) % words.length), 2400);
    return () => clearInterval(t);
  }, [words.length]);
  return (
    <span className={`relative inline-block align-baseline ${className}`} style={{ minWidth: "5ch" }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block italic text-[#89e7ff]"
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
