import { Store, ShoppingCart, CreditCard, Truck } from "lucide-react";

const steps = [
  { icon: Store, title: "Browse the store", text: "Explore the catalogue by category or search for what you need." },
  { icon: ShoppingCart, title: "Build cart", text: "Add favourites or buy instantly from any product." },
  { icon: CreditCard, title: "Checkout", text: "Use saved addresses and preferred payment options." },
  { icon: Truck, title: "Delivered", text: "Track dispatch and delivery from your account." },
];

export default function ProcessFlow() {
  return (
    <section className="mt-10 rounded-2xl border border-line/5 bg-surface p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">How it works</p>
          <h2 className="mt-1 font-display text-[22px] font-extrabold text-ink">From shelf to doorstep</h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <div key={title} className="relative rounded-xl bg-surface-alt p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-white">
                <Icon size={18} />
              </div>
              <span className="font-display text-[28px] font-extrabold text-black/10">{index + 1}</span>
            </div>
            <h3 className="text-[14px] font-bold text-ink">{title}</h3>
            <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
