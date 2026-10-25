/** Sellzy "pill" form field — rounded-full input with a label above it,
 * matching the settings__general/shop/seo/maintenance template inputs
 * (a simplified, non-floating variant of the template's floating-label
 * pill fields — same shape, without recreating Headless UI's JS). */

const pill: React.CSSProperties = {
  height: 48,
  borderRadius: 9999,
  padding: '0 18px',
};

/* An inline style outranks every stylesheet rule, so a select styled with
   `pill` has to reserve the chevron's space itself. */
const pillSelect: React.CSSProperties = { ...pill, paddingRight: 34 };

export function PillInput({
  label, name, defaultValue, placeholder, type = 'text', required, help,
}: {
  label: string; name: string; defaultValue?: string; placeholder?: string;
  type?: string; required?: boolean; help?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ak-field-label">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="ak-input"
        style={pill}
      />
      {help && <span className="ak-help">{help}</span>}
    </label>
  );
}

export function PillTextarea({
  label, name, defaultValue, placeholder, rows = 4, help,
}: {
  label: string; name: string; defaultValue?: string; placeholder?: string; rows?: number; help?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ak-field-label">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="ak-input"
        style={{ borderRadius: 20, padding: '14px 18px', height: 'auto', resize: 'none' }}
      />
      {help && <span className="ak-help">{help}</span>}
    </label>
  );
}

export function PillSelect({
  label, name, defaultValue, children,
}: {
  label: string; name?: string; defaultValue?: string; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ak-field-label">{label}</span>
      <select name={name} defaultValue={defaultValue} className="ak-select" style={pillSelect}>
        {children}
      </select>
    </label>
  );
}

/** Card shell matching the template's nested `border border-gray-500/20
 * rounded-2xl` panels (no drop shadow — that lives on the outer ak-card). */
export function SettingsCard({ title, sub, badge, children }: {
  title: string; sub?: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-6" style={{ border: '1px solid var(--border)', borderRadius: 16 }}>
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-1)' }}>{title}</h3>
        {badge}
      </div>
      {sub && <p className="text-sm -mt-4 mb-5" style={{ color: 'var(--text-2)' }}>{sub}</p>}
      {children}
    </div>
  );
}
