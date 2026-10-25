"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuth, onLogin, onLogout } from "@/lib/auth-store";

export type AddressLabel = "Home" | "Work" | "Other";

/* Countries, subdivisions and postcode formats live in ./countries, which is
   generated against the ISO list rather than hand-kept. Re-exported here so
   the address forms keep importing their address concerns from one place. */
export {
  COUNTRY_CODES,
  countryName,
  countryOptions,
  storeCountryCode,
  regionLabel,
  subdivisions,
  postcodeRule,
  validatePostcode,
} from "./countries";

export type Address = {
  id: string;
  label: AddressLabel;
  fullName: string;
  phone: string;
  country: string;
  county: string;
  city: string;
  street: string;
  building?: string;
  postcode?: string;
  notes?: string;
  /* Where the parcel actually goes. Null until someone places a pin — the
     address book saved none at all before, so addresses created here were
     flat text while the ones checkout created carried a point. */
  latitude: number | null;
  longitude: number | null;
  geocodeSource: "geocoded" | "pin" | "";
  isDefault: boolean;
};

export type AddressInput = Omit<Address, "id">;

type ServerAddress = {
  id: number;
  label: string;
  notes: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  county_or_state: string;
  postal_code: string;
  country_code: string;
  // DRF renders DecimalField as a string so a JSON parser cannot round it.
  latitude: string | null;
  longitude: string | null;
  geocode_source: string;
  is_default: boolean;
};

/** The API's decimal string to a number the map can use, and nothing to null. */
function coordinate(value: string | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fromServer(a: ServerAddress): Address {
  return {
    id: String(a.id),
    label: (["Home", "Work", "Other"].includes(a.label) ? a.label : "Other") as AddressLabel,
    fullName: a.full_name,
    phone: a.phone,
    country: a.country_code,
    county: a.county_or_state,
    city: a.city,
    street: a.line1,
    building: a.line2 || undefined,
    postcode: a.postal_code || undefined,
    notes: a.notes || undefined,
    latitude: coordinate(a.latitude),
    longitude: coordinate(a.longitude),
    geocodeSource: (a.geocode_source === "geocoded" || a.geocode_source === "pin") ? a.geocode_source : "",
    isDefault: a.is_default,
  };
}

function toServer(input: Partial<AddressInput>) {
  const body: Record<string, unknown> = {};
  if (input.label !== undefined) body.label = input.label;
  if (input.notes !== undefined) body.notes = input.notes ?? "";
  if (input.fullName !== undefined) body.full_name = input.fullName;
  if (input.phone !== undefined) body.phone = input.phone;
  if (input.street !== undefined) body.line1 = input.street;
  if (input.building !== undefined) body.line2 = input.building ?? "";
  if (input.city !== undefined) body.city = input.city;
  if (input.county !== undefined) body.county_or_state = input.county;
  if (input.postcode !== undefined) body.postal_code = input.postcode ?? "";
  if (input.country !== undefined) body.country_code = input.country;
  /* Sent as a set or not at all, the same rule checkout follows: half a point
     is not a location, and a source without a point claims a precision the
     address does not carry. */
  if (input.latitude !== undefined || input.longitude !== undefined) {
    const located = input.latitude != null && input.longitude != null;
    body.latitude = located ? input.latitude : null;
    body.longitude = located ? input.longitude : null;
    body.geocode_source = located ? (input.geocodeSource ?? "") : "";
  }
  if (input.isDefault !== undefined) body.is_default = input.isDefault;
  return body;
}

function isAuthed() {
  return Boolean(useAuth.getState().user);
}

/** Same call shape as the account API wrappers: a rejected write has to reach
 *  the form that made it, or a save that failed reads as one that worked. */
async function serverWrite(path: string, init: RequestInit) {
  const response = await fetch(path, init);
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail || "Could not save that address.");
  }
  return response;
}

async function serverList(): Promise<Address[] | null> {
  const res = await fetch("/api/account/addresses").catch(() => null);
  if (!res || !res.ok) return null;
  const data = (await res.json()) as ServerAddress[];
  return data.map(fromServer);
}

type AddressState = {
  addresses: Address[];
  hydrated: boolean;
  /** Pull the server list when signed in (no-op for guests). */
  sync: () => Promise<void>;
  add: (input: AddressInput) => Promise<void>;
  update: (id: string, patch: Partial<AddressInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
};

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `addr_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export const useAddresses = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: [],
      hydrated: false,
      sync: async () => {
        if (!isAuthed()) return;
        const addresses = await serverList();
        if (addresses) set({ addresses });
      },
      add: async (input) => {
        if (isAuthed()) {
          await serverWrite("/api/account/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toServer(input)),
          });
          await get().sync();
          return;
        }
        const id = uid();
        set((state) => {
          const becomesFirst = state.addresses.length === 0;
          const promote = input.isDefault || becomesFirst;
          const others = promote
            ? state.addresses.map((a) => ({ ...a, isDefault: false }))
            : state.addresses;
          return { addresses: [...others, { ...input, id, isDefault: promote }] };
        });
      },
      update: async (id, patch) => {
        if (isAuthed()) {
          await serverWrite(`/api/account/addresses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toServer(patch)),
          });
          await get().sync();
          return;
        }
        set((state) => {
          const willPromote = patch.isDefault === true;
          return {
            addresses: state.addresses.map((a) => {
              if (a.id === id) return { ...a, ...patch };
              if (willPromote) return { ...a, isDefault: false };
              return a;
            }),
          };
        });
      },
      remove: async (id) => {
        if (isAuthed()) {
          await serverWrite(`/api/account/addresses/${id}`, { method: "DELETE" });
          await get().sync();
          return;
        }
        set((state) => {
          const target = state.addresses.find((a) => a.id === id);
          const remaining = state.addresses.filter((a) => a.id !== id);
          if (target?.isDefault && remaining.length > 0) {
            remaining[0] = { ...remaining[0], isDefault: true };
          }
          return { addresses: remaining };
        });
      },
      setDefault: async (id) => {
        if (isAuthed()) {
          await serverWrite(`/api/account/addresses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_default: true }),
          });
          await get().sync();
          return;
        }
        set((state) => ({
          addresses: state.addresses.map((a) => ({ ...a, isDefault: a.id === id })),
        }));
      },
    }),
    {
      name: "store-addresses",
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);

// After a fresh sign-in, push any guest addresses to the server once, then
// switch to the server copy.
onLogin(() => {
  void (async () => {
    const { addresses } = useAddresses.getState();
    const guestAddresses = addresses.filter((a) => !/^\d+$/.test(a.id));
    for (const address of guestAddresses) {
      await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toServer(address)),
      }).catch(() => undefined);
    }
    await useAddresses.getState().sync();
  })();
});

// The book that was on screen belongs to the account that just left. Keeping it
// would show the next person on this device someone else's delivery addresses,
// and would let them edit rows that only exist server-side.
onLogout(() => useAddresses.setState({ addresses: [] }));
