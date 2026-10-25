import { create } from "zustand";

/** The product a conversation was opened from, when it was opened from one. */
export type AssistantContext = { slug: string; name: string } | null;

type AssistantState = {
  open: boolean;
  /** A question to send as soon as the panel opens. */
  pending: string | null;
  context: AssistantContext;
  /** Open the panel, optionally about a product and optionally asking something. */
  ask: (opts?: { question?: string; context?: AssistantContext }) => void;
  close: () => void;
  /** Set by whatever page the shopper is on, independent of opening the panel. */
  setContext: (context: AssistantContext) => void;
  consumePending: () => string | null;
};

/* Shared so the product page can open the panel and the panel can stay mounted
   in the layout. The alternative — rendering a second copy of the chat inside
   the product page — would give a shopper two conversations depending on where
   they clicked. */
export const useAssistant = create<AssistantState>((set, get) => ({
  open: false,
  pending: null,
  context: null,
  ask: (opts) =>
    set({
      open: true,
      pending: opts?.question ?? null,
      // Only replace context when one is supplied; opening the panel from the
      // floating button on a product page should keep that product in view.
      context: opts?.context !== undefined ? opts.context : get().context,
    }),
  close: () => set({ open: false, pending: null }),
  setContext: (context) => set({ context }),
  consumePending: () => {
    const q = get().pending;
    if (q) set({ pending: null });
    return q;
  },
}));

/** Starter questions for a product, from what we know about it.
 *
 * Written as things a shopper actually types, not as feature labels — the
 * point of a suggestion is that tapping it is faster than thinking of it. */
export function productSuggestions(name: string, hasOptions: boolean): string[] {
  const short = name.length > 34 ? "this" : `the ${name}`;
  return [
    `Is ${short} in stock?`,
    ...(hasOptions ? [`What sizes and colours does ${short} come in?`] : []),
    `Tell me more about ${short}`,
    "How long does delivery take?",
    "What is your return policy?",
  ];
}
