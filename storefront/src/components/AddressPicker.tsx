"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
// Leaflet's stylesheet is a static import: bundlers type CSS as a module only
// when it is imported this way, and the map renders as a grey box without it.
import "leaflet/dist/leaflet.css";

/* Find the place, then say exactly where.
 *
 * Two halves, because in Kenya neither is enough alone. A search box because
 * nobody wants to pan a map from space to their estate; a draggable pin
 * because OSM's address coverage here stops well short of the gate, and a
 * rider needs the gate. What the customer types stays authoritative — the pin
 * adds a point, it does not overwrite the words with a geocoder's guess of
 * them.
 *
 * Everything degrades. No API key, or the provider is down, and the search box
 * says so and steps aside; the map still works. No JavaScript at all and the
 * plain address fields beneath are what they always were. An address form that
 * cannot be completed is a sale that does not happen, so nothing here is
 * allowed to become load-bearing.
 */

export type PickedPlace = {
  line1: string;
  city: string;
  county_or_state: string;
  postal_code: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  geocode_source: "geocoded" | "pin" | "";
};

type Suggestion = Omit<PickedPlace, "geocode_source"> & { label: string };

/** Nairobi, for a map that has nothing else to centre on. */
const FALLBACK_CENTRE: [number, number] = [-1.2921, 36.8219];

export default function AddressPicker({
  value,
  onPick,
  country,
  apiBase = "/api/geocode",
}: {
  value?: { latitude?: number | null; longitude?: number | null };
  onPick: (place: Partial<PickedPlace>) => void;
  /** Which country to search in. Left out, the backend searches the store's
   *  own — which is right for most orders and wrong for everyone abroad, who
   *  otherwise cannot find their street at all. */
  country?: string;
  /** Overridden by the admin, which reaches the backend on a different path.
   *  No trailing slash: these are Next route handlers, and Next redirects
   *  `/suggest/` to `/suggest` with a 308 — a wasted round trip on every
   *  search. Django's own routes do want the slash, which is why the admin's
   *  copy of this component keeps it. */
  apiBase?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const listId = useId();

  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ map: unknown; marker: unknown } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const lat = value?.latitude ?? null;
  const lon = value?.longitude ?? null;

  /* What makes it feel instant (the admin's copy does the same). A fresh
     search costs about a second at the geocoder, so the box should rarely
     wait for one: answers are remembered (per country — the same text means
     different places in different countries); while a longer query is out,
     the last answers that still match every word typed stay up; only the
     newest request counts; and a short debounce, because the provider counts
     requests, not intentions. */
  const cache = useRef(new Map<string, { results: Suggestion[]; unavailable: string | null }>());
  const lastResults = useRef<Suggestion[]>([]);
  const warmed = useRef(false);
  const picked = useRef<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    const lower = text.toLowerCase();
    if (picked.current === lower) {
      // The label just chosen went into the box; that is not a new search.
      picked.current = null;
      setSearching(false);
      return;
    }
    const key = `${country || ""}:${lower}`;
    const hit = cache.current.get(key);
    if (hit) {
      setResults(hit.results);
      setUnavailable(hit.unavailable);
      setActive(0);
      setOpen(true);
      setSearching(false);
      return;
    }
    const words = lower.split(/\s+/).filter(Boolean);
    const still = lastResults.current.filter((r) => words.every((w) => r.label.toLowerCase().includes(w)));
    if (still.length) {
      setResults(still);
      setOpen(true);
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${apiBase}/suggest?q=${encodeURIComponent(text)}` +
            (country ? `&country=${encodeURIComponent(country)}` : ""),
          { signal: controller.signal },
        );
        const data = await response.json();
        const found: Suggestion[] = data.results ?? [];
        const entry = { results: found, unavailable: data.unavailable ?? null };
        if (!entry.unavailable) cache.current.set(key, entry);
        if (found.length) lastResults.current = found;
        setUnavailable(entry.unavailable);
        setResults(found);
        setActive(0);
        setOpen(true);
        setSearching(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setUnavailable("unreachable");
        setSearching(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `country` included: switching country with text already typed has to
    // search again, not leave the previous country's suggestions standing.
  }, [query, apiBase, country]);

  /* Opens the connection while the shopper is still thinking, so the first
     real search doesn't also pay for it. Under three letters the backend never
     asks the geocoder, so this costs no quota. */
  const warm = useCallback(() => {
    if (warmed.current) return;
    warmed.current = true;
    fetch(`${apiBase}/suggest?q=`).catch(() => {});
  }, [apiBase]);

  /* Leaflet is loaded only once this component is on screen, and only in the
     browser: it reaches for `window` on import, which is fatal during server
     rendering. */
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !mapNode.current || mapRef.current) return;

      const centre: [number, number] = lat != null && lon != null ? [lat, lon] : FALLBACK_CENTRE;
      const map = L.map(mapNode.current).setView(centre, lat != null ? 16 : 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        // Required by the tile usage policy, and simply good manners.
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      /* A drawn pin rather than Leaflet's default one. Its stock icon is a
         PNG referenced by a relative path that bundlers rewrite and then fail
         to find, which shows up as an invisible marker — the single most
         common way this component silently breaks. */
      const icon = L.divIcon({
        className: "",
        html:
          '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;' +
          'transform:rotate(-45deg);background:#0f766e;border:2px solid #fff;' +
          'box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      });
      const marker = L.marker(centre, { draggable: true, icon }).addTo(map);
      marker.on("dragend", async () => {
        const { lat: dLat, lng: dLon } = marker.getLatLng();
        // The point is the answer the moment it is dropped. Reverse geocoding
        // only fills in blanks afterwards, and is allowed to fail.
        onPick({ latitude: dLat, longitude: dLon, geocode_source: "pin" });
        try {
          const response = await fetch(`${apiBase}/reverse?lat=${dLat}&lon=${dLon}`);
          const data = await response.json();
          if (data.result) {
            onPick({
              city: data.result.city || undefined,
              county_or_state: data.result.county_or_state || undefined,
              latitude: dLat,
              longitude: dLon,
              geocode_source: "pin",
            });
          }
        } catch {
          /* The pin is placed; naming it is a courtesy. */
        }
      });
      map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(event.latlng);
        marker.fire("dragend");
      });

      mapRef.current = { map, marker };
      setMapReady(true);
    })();
    return () => {
      disposed = true;
    };
    // Set up once; later coordinate changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A chosen suggestion moves the map, rather than leaving the pin where the
     last one was and quietly disagreeing with the address above it. */
  useEffect(() => {
    if (!mapReady || lat == null || lon == null || !mapRef.current) return;
    const { map, marker } = mapRef.current as {
      map: { setView: (c: [number, number], z: number) => void };
      marker: { setLatLng: (c: [number, number]) => void };
    };
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon], 16);
  }, [lat, lon, mapReady]);

  const choose = useCallback(
    (s: Suggestion) => {
      picked.current = s.label.trim().toLowerCase();
      setQuery(s.label);
      setOpen(false);
      onPick({
        line1: s.line1,
        city: s.city,
        county_or_state: s.county_or_state,
        postal_code: s.postal_code,
        country_code: s.country_code || "KE",
        latitude: s.latitude,
        longitude: s.longitude,
        geocode_source: "geocoded",
      });
    },
    [onPick],
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            warm();
            if (results.length > 0) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            // Arrows move, Enter takes the highlighted place (the top one by
            // default) and never submits the checkout while the list is open.
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(results[Math.min(active, results.length - 1)]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          aria-activedescendant={open && results.length ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder="Search an estate, road or landmark…"
          aria-label="Search for your address"
          aria-controls={listId}
          aria-expanded={open}
          role="combobox"
          className="w-full rounded-lg border py-2 pl-3 pr-9 text-sm"
        />
        {searching && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
          />
        )}
        {open && results.length > 0 && (
          <ul id={listId} role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-white shadow-lg">
            {results.map((s, i) => (
              <li key={`${s.label}-${i}`}>
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${i}`}
                  aria-selected={i === active}
                  // On press, not release: it feels immediate, and the list
                  // closing on blur can't swallow the click.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`block w-full px-3 py-2 text-left text-sm ${i === active ? "bg-gray-100" : "hover:bg-gray-100"}`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {unavailable && (
        /* Said plainly, because the alternative — a box that silently returns
           nothing — reads as "your address does not exist". */
        <p className="text-xs text-gray-500">
          Address search is unavailable right now. Drop the pin on the map and fill in the fields below.
        </p>
      )}

      <div
        ref={mapNode}
        className="h-56 w-full overflow-hidden rounded-lg border"
        style={{ background: "#e8eef0" }}
        aria-label="Map. Drag the pin to your exact location."
      />
      <p className="text-xs text-gray-500">
        {lat != null && lon != null
          ? `Pin at ${lat.toFixed(5)}, ${lon.toFixed(5)} — drag it to your gate for a more exact delivery.`
          : "Search above, or tap the map to drop a pin where you want the delivery."}
      </p>
    </div>
  );
}
