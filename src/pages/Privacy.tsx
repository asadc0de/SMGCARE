import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";

const Privacy = () => {
  return (
    <PageShell>
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 bg-background text-foreground overflow-hidden min-h-screen">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-accent-soft/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="container-x relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-16 md:mb-24">
              <span className="eyebrow mb-6">Legal Information</span>
              <h1 className="font-display text-5xl md:text-7xl leading-tight tracking-tighter text-primary">
                Privacy <span className="italic text-accent">Policy.</span>
              </h1>
              <p className="mt-6 text-muted-foreground text-lg border-l-2 border-accent pl-4">
                Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="prose prose-lg prose-slate max-w-none text-muted-foreground space-y-12">
              
              <div>
                <h2 className="font-display text-3xl text-primary mb-4">SMS Privacy Policy</h2>
                <p className="leading-relaxed text-xl text-foreground font-medium mb-8">
                  We respect and prioritize the privacy of our clients. The personal information collected through SMS communications will be handled with care and will not be shared, sold, or distributed to third parties for marketing or promotional purposes.
                </p>
                <p className="leading-relaxed">
                  No mobile information, including phone numbers, will be disclosed to third parties or affiliates for advertising purposes. Furthermore, any data related to text messaging originator opt-in consent will remain strictly confidential and will not be shared with any external entities.
                </p>
                <p className="leading-relaxed mt-4">
                  Our commitment to your privacy means that all SMS-related interactions adhere to strict security protocols to ensure the protection of your information. If you have any questions regarding this policy, please contact us.
                </p>
              </div>

              <div className="p-8 bg-surface border border-border rounded-3xl mt-16">
                <h3 className="font-display text-2xl text-primary mb-2">Questions or Concerns?</h3>
                <p className="text-base text-muted-foreground mb-6">
                  If you have any questions regarding this policy, please reach out to our legal compliance team.
                </p>
                <div className="flex gap-4">
                  <a href="mailto:info@smgcares.org" className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors">
                    Contact Privacy Team
                  </a>
                  <a href="/" className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-white border border-border text-foreground font-bold hover:bg-surface transition-colors shadow-sm">
                    Back to Resources
                  </a>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </section>
    </PageShell>
  );
};

export default Privacy;
