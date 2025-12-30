"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // For now, just simulate a submission
    // In production, this would send to an API endpoint
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
        <p className="text-gray-400 mb-4">
          Thank you for reaching out. We&apos;ll get back to you as soon as possible.
        </p>
        <Button
          variant="outline"
          onClick={() => setSuccess(false)}
          className="border-white/10 text-white hover:bg-white/5"
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-gray-300">
            Name
          </Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Your name"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject" className="text-gray-300">
          Subject
        </Label>
        <Input
          id="subject"
          value={form.subject}
          onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
          placeholder="How can we help?"
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className="text-gray-300">
          Message
        </Label>
        <Textarea
          id="message"
          value={form.message}
          onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
          placeholder="Tell us more..."
          rows={6}
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-white text-black hover:bg-gray-100"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Send Message"
        )}
      </Button>
    </form>
  );
}






















