export default function StoreLoader() {
  return (
    <div className="page-loader">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner" />
        <div className="text-center">
          <p className="font-display text-[16px] font-bold text-ink">Setting up the store</p>
          <p className="mt-1 text-[12px] text-ink-muted">Loading products, promos, and delivery options</p>
        </div>
      </div>
    </div>
  );
}
