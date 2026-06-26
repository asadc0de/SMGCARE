import { ReactNode } from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

export const PageShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background relative overflow-x-hidden">
    {/* Global Professional Background Texture */}
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(55,88,150,0.05),transparent_70%)]" />
      <div className="absolute inset-0 grain opacity-[0.03]" />
    </div>
    
    <div className="relative z-10 flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-grow">{children}</main>
      <SiteFooter />
    </div>
  </div>
);
