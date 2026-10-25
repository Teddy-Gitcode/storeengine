"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStoreSettings } from "@/lib/store-context";
import ProcessFlow from "@/components/ProcessFlow";
import { getFaqs, type StorefrontFaq } from "@/lib/content-api";
import { Check } from "lucide-react";

export default function ContactPage() {
  const [managedFaqs, setManagedFaqs] = useState<StorefrontFaq[]>([]);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settings = useStoreSettings();
  const location = [settings.address, settings.city, settings.country].filter(Boolean).join(", ");

  // FAQs are authored in the admin (Promotions & Content → FAQ). The form
  // needs client state, so they are fetched here rather than on the server;
  // the section renders its defaults until they arrive.
  useEffect(() => {
    let cancelled = false;
    getFaqs().then((faqs) => {
      if (!cancelled) setManagedFaqs(faqs);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          subject: fd.get("subject"),
          message: fd.get("message"),
          // The ticket API takes an order number; the form never offered one,
          // so every question about an order arrived without its reference.
          order_number: fd.get("order_number") || "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Couldn't send your message.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your message.");
    } finally {
      setBusy(false);
    }
  }

  // No hard-coded fallbacks: the template's answers promised delivery windows,
  // a returns window and a payment-method list that this merchant never agreed
  // to. The section only appears once FAQs are authored in the admin.
  const faqs = managedFaqs.map((f) => ({ q: f.question, a: f.answer }));

  return (
    <div className="container-store py-10 max-w-3xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand font-semibold">Contact</p>
        <h1 className="text-[36px] font-semibold leading-tight text-ink mt-2">We'd love to hear from you</h1>
      </header>

      <div className="grid md:grid-cols-[1fr_300px] gap-8">
        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-line/5 rounded-xl p-6 flex flex-col gap-4"
        >
          {sent ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-brand-50 text-brand flex items-center justify-center mx-auto mb-3">
                <Check size={26} strokeWidth={2.5} aria-hidden />
              </div>
              <div className="font-semibold text-ink">Message sent</div>
              <p className="text-sm text-ink-muted">Our team will get back to you by email.</p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-4 text-[13px] font-semibold text-brand hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Your name" name="name" required autoComplete="name" />
                <Field label="Email" name="email" type="email" required autoComplete="email" inputMode="email" />
              </div>
              <Field label="Subject" name="subject" required />
              <Field label="Order number (if your message is about one)" name="order_number" />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Message <span className="text-danger">*</span></span>
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="soft-input px-3 py-2.5 text-sm resize-y"
                />
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input type="checkbox" name="consent" required className="accent-brand mt-0.5 h-4 w-4" />
                <span className="text-[12.5px] leading-relaxed text-ink-muted">
                  I agree that {settings.business_name} may use these details to answer my message,
                  as described in the{" "}
                  <Link href="/legal/privacy" className="text-brand hover:underline">Privacy Notice</Link>.
                </span>
              </label>
              {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary !py-3 self-start disabled:opacity-70">
                {busy ? "Sending…" : "Send message"}
              </button>
            </>
          )}
        </form>

        <aside className="flex flex-col gap-4">
          {location && (
            <div className="bg-brand text-white rounded-xl p-5">
              <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Head office</div>
              <div className="font-semibold">{settings.business_name}</div>
              <div className="text-sm opacity-90 mt-0.5">{location}</div>
            </div>
          )}
          {settings.support_phone && <InfoCard title="Customer support" value={settings.support_phone} />}
          {settings.support_email && <InfoCard title="Email" value={settings.support_email} />}
          {settings.whatsapp && <InfoCard title="WhatsApp" value={settings.whatsapp} />}
        </aside>
      </div>

      <ProcessFlow />

      {faqs.length > 0 && (
      <section id="faq" className="mt-14 scroll-mt-32">
        <h2 className="text-[24px] font-semibold text-ink mb-4">Frequently asked</h2>
        <ul className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <li key={i}>
              <details className="bg-surface border border-line/5 rounded-lg p-4 group">
                <summary className="cursor-pointer font-medium text-ink flex justify-between items-center">
                  {f.q}
                  <span className="text-brand text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-ink-muted mt-3">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>
      )}
    </div>
  );
}

function Field({ label, name, type = "text", required, autoComplete, inputMode }: {
  label: string; name: string; type?: string; required?: boolean; autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}{required && <span className="text-danger"> *</span>}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="soft-input px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function InfoCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-line/5 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-ink-muted mb-1">{title}</div>
      <div className="font-semibold text-ink">{value}</div>
      {sub && <div className="text-xs text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}
