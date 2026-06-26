import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import Events from "./pages/Events.tsx";
import Golf from "./pages/Golf.tsx";
import Gallery from "./pages/Gallery.tsx";
import Donate from "./pages/Donate.tsx";
import GolfRegister from "./pages/GolfRegister.tsx";
import Admin from "./pages/Admin.tsx";
import EventDetail from "./pages/EventDetail.tsx";
import NotFound from "./pages/NotFound.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const DomainRedirect = () => {
  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname === "smgcares.com" || hostname === "www.smgcares.com") {
      const newUrl = new URL(window.location.href);
      newUrl.hostname = "smgcares.org";
      if (newUrl.pathname === "/golf-register") {
        newUrl.searchParams.set("scroll", "true");
      }
      window.location.replace(newUrl.toString());
    }
  }, []);
  return null;
};

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DomainRedirect />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/golf" element={<Golf />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/golf-register" element={<GolfRegister />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
