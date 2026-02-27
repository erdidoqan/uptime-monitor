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

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Mesaj gönderilemedi.");
      }

      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Mesaj gönderilemedi. Lütfen tekrar deneyin."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Mesajınız Gönderildi!</h3>
        <p className="text-gray-400 mb-4">
          Bizimle iletişime geçtiğiniz için teşekkürler. En kısa sürede size dönüş yapacağız.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSuccess(false)}
          className="border-white/10 text-white hover:bg-white/5"
        >
          Başka Bir Mesaj Gönder
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-gray-300">
            Ad Soyad
          </Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Adınız Soyadınız"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300">
            E-posta
          </Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="ornek@eposta.com"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject" className="text-gray-300">
          Konu
        </Label>
        <Input
          id="subject"
          value={form.subject}
          onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
          placeholder="Size nasıl yardımcı olabiliriz?"
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className="text-gray-300">
          Mesaj
        </Label>
        <Textarea
          id="message"
          value={form.message}
          onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
          placeholder="Mesajınızı buraya yazın..."
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
            Gönderiliyor...
          </>
        ) : (
          "Mesaj Gönder"
        )}
      </Button>
    </form>
  );
}
