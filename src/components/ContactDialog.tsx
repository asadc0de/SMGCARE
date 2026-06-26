import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const WEB3FORMS_ACCESS_KEY = "a3cdab0e-c130-42ed-a2f3-107436af5a8a";

export const ContactDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: "New Contact Message - SMG Cares",
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Email delivery failed.");
      }

      toast.success("Message sent — we'll be in touch soon.");
      setFormData({ name: "", email: "", phone: "", message: "" });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface-elev border-border rounded-3xl">
        <DialogHeader>
          <span className="eyebrow mb-2">Get in touch</span>
          <DialogTitle className="font-display text-3xl text-primary">Send us a message</DialogTitle>
          <DialogDescription>We'd love to hear from you. Drop us a note and we'll respond shortly.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <Input
            required
            maxLength={100}
            placeholder="Your name"
            className="h-12 rounded-xl"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              required
              type="email"
              maxLength={255}
              placeholder="Email address"
              className="h-12 rounded-xl"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              required
              maxLength={20}
              placeholder="Phone number"
              className="h-12 rounded-xl"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <Textarea
            required
            maxLength={1000}
            placeholder="How can we help?"
            rows={5}
            className="rounded-xl resize-none"
            value={formData.message}
            onChange={e => setFormData({ ...formData, message: e.target.value })}
          />
          <Button type="submit" disabled={submitting} className="w-full h-12 bg-gradient-navy text-primary-foreground rounded-xl font-semibold shadow-soft">
            {submitting ? "Sending…" : "Send message"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
