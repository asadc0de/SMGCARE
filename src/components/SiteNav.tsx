import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "./ContactDialog";
import { CustomDonationModal } from "./CustomDonationModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import smgLogo from "@/assets/logo.webp";
import { NavLink } from "./NavLink";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/events", label: "Recent Events" },
  { to: "/golf", label: "2026 Golf Fundraiser" },
  { to: "/gallery", label: "Gallery" },
];

export const SiteNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  const isSolidNav = scrolled || pathname.startsWith('/admin') || pathname === '/privacy' || pathname === '/terms';

  return (
    <>
      <header className="fixed top-6 inset-x-0 z-50 flex justify-center px-4">
        <div className={`flex items-center justify-between w-full max-w-6xl h-20 px-6 rounded-full transition-all duration-500 border border-white/10 ${isSolidNav ? "bg-primary/90 backdrop-blur-xl shadow-lg scale-[0.98]" : "bg-white/10 backdrop-blur-md"}`}>
          <div className="flex-1 flex justify-start shrink-0">
            <Link to="/" className="flex items-center group shrink-0">
              <img src={smgLogo} alt="SMG Cares" className="h-14 md:h-16 w-auto" />
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 shrink-0">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className="text-[11px] xl:text-[12px] uppercase tracking-widest font-semibold transition-colors text-white/80 hover:text-white whitespace-nowrap"
                activeClassName="!text-[#72a8ff]"
              >
                {l.label}
              </NavLink>
            ))}
            <button 
              onClick={() => setContactOpen(true)} 
              className="text-[11px] xl:text-[12px] uppercase tracking-widest font-semibold text-white/80 hover:text-white transition-colors shrink-0 whitespace-nowrap"
            >
              Contact
            </button>
          </nav>

          <div className="flex-1 flex justify-end items-center gap-3 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="hidden sm:inline-flex bg-gradient-gold text-accent-foreground hover:opacity-90 rounded-full px-6 h-9 text-sm font-bold uppercase tracking-wider group">
                  Donate Now <ChevronDown className="ml-2 w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-primary text-primary-foreground border-white/10 mt-2">
                <DropdownMenuItem onClick={() => setDonationOpen(true)} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 font-medium">
                  Donate to SMG Cares
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-white/10 focus:bg-white/10 font-medium">
                  <Link to="/golf-register?scroll=true">2026 Charity Golf Outing</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={() => setOpen(o => !o)} className="lg:hidden p-1.5 text-white" aria-label="Menu">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-20 inset-x-4 lg:hidden overflow-hidden rounded-3xl p-6 bg-primary/95 backdrop-blur-2xl border border-white/10">
              <div className="flex flex-col gap-4">
                {links.map(l => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className="text-lg font-display text-white py-1 border-b border-white/10"
                    activeClassName="!text-[#72a8ff]"
                  >
                    {l.label}
                  </NavLink>
                ))}
                <button onClick={() => { setOpen(false); setContactOpen(true); }} className="text-lg font-display text-white py-1 text-left border-b border-white/10">Contact Us</button>
                <div className="flex flex-col gap-2 mt-2">
                  <Button onClick={() => { setOpen(false); setDonationOpen(true); }} className="bg-gradient-gold text-accent-foreground rounded-full w-full">Donate to SMG Cares</Button>
                  <Button asChild variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-full w-full"><Link to="/golf-register?scroll=true">2026 Charity Golf Outing</Link></Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
      <CustomDonationModal open={donationOpen} onOpenChange={setDonationOpen} />
    </>
  );
};