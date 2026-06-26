import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";

const Terms = () => {
  return (
    <PageShell>
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 bg-background text-foreground overflow-hidden min-h-screen">

        {/* Decorative Background Elements */}
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="container-x relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-16 md:mb-24">
              <span className="eyebrow mb-6">Legal Information</span>
              <h1 className="font-display text-5xl md:text-7xl leading-tight tracking-tighter text-primary">
                Terms & <span className="italic text-accent">Conditions.</span>
              </h1>
              <p className="mt-6 text-muted-foreground text-lg border-l-2 border-accent pl-4">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="prose prose-lg prose-slate max-w-none text-muted-foreground space-y-12">

              <div>
                <h2 className="font-display text-3xl text-primary mb-4">1. Agreement to Terms</h2>
                <p className="leading-relaxed">
                  These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity, and SMG Cares ("we," "us," or "our"), concerning your access to and use of the smgcares.org website as well as any other media form, media channel, mobile website, or mobile application related, linked, or otherwise connected thereto.
                </p>
                <p className="leading-relaxed mt-4">
                  You agree that by accessing the site, you have read, understood, and agreed to be bound by all of these Terms and Conditions. If you do not agree with all of these Terms and Conditions, then you are expressly prohibited from using the site and you must discontinue use immediately.
                </p>
              </div>

              <div>
                <h2 className="font-display text-3xl text-primary mb-4">2. Intellectual Property Rights</h2>
                <p className="leading-relaxed">
                  Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights and unfair competition laws of the United States, international copyright laws, and international conventions.
                </p>
              </div>

              <div>
                <h2 className="font-display text-3xl text-primary mb-4">3. User Representations</h2>
                <p className="leading-relaxed">
                  By using the Site, you represent and warrant that: (1) you have the legal capacity and you agree to comply with these Terms and Conditions; (2) you are not a minor in the jurisdiction in which you reside; (3) you will not access the Site through automated or non-human means, whether through a bot, script or otherwise; (4) you will not use the Site for any illegal or unauthorized purpose; and (5) your use of the Site will not violate any applicable law or regulation.
                </p>
              </div>

              <div>
                <h2 className="font-display text-3xl text-primary mb-4">4. Donations and Contributions</h2>
                <p className="leading-relaxed">
                  SMG Cares is a registered 501(c)(3) tax-exempt organization. When you make a donation through our platform, you agree to provide valid and current payment information. All donations are final and non-refundable unless otherwise required by law or determined at our sole discretion. We reserve the right to refuse or cancel any donation for any reason.
                </p>
              </div>

              <div className="p-8 bg-surface border border-border rounded-3xl mt-16">
                <h3 className="font-display text-2xl text-primary mb-2">Questions or Concerns?</h3>
                <p className="text-base text-muted-foreground mb-6">
                  If you have any questions regarding these terms, please reach out to our legal compliance team.
                </p>
                <a href="mailto:info@smgcares.org" className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors">
                  Contact Legal
                </a>
              </div>

            </div>
          </motion.div>
        </div>
      </section>
    </PageShell>
  );
};

export default Terms;
