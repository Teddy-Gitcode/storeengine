'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

/* Put the warehouse on the map.
 *
 * A sibling of apps/storefront/src/components/AddressPicker.tsx, which does
 * the same job for a shopper. The two are separate files because admin and
 * storefront are separate Next apps with separate node_modules and no shared
 * package — the same reason ThemeToggle exists twice. Behaviour changes worth
 * having should be made in both.
 *
 * Two differences from the storefront's. It talks to Django directly rather
 * than through a route handler, because the admin has no /api/* proxy layer
 * and the geocode endpoints are public. And it submits through hidden inputs
 * rather than a callback, because ResourceForm posts a plain FormData to a
 * server action — so the point has to be *in* the form, not beside it.
 *
 * Why a warehouse needs coordinates at all: the distance from a warehouse to a
 * delivery address decides which location a parcel should leave from, and with
 * both points stored that is a subtraction instead of two geocoding calls on
 * every order.
 */

const FALLBACK_CENTRE: [number, number] = [-1.2921, 36.8219]; // Nairobi.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

type Suggestion = {
  label: string;
  line1: string;
  city: string;
  county_or_state: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
};

export default function AddressPicker({
  label,
  latitudeName = 'latitude',
  longitudeName = 'longitude',
  sourceName = 'geocode_source',
  defaultLatitude = null,
  defaultLongitude = null,
  defaultSource = '',
}: {
  label: string;
  latitudeName?: string;
  longitudeName?: string;
  sourceName?: string;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
  defaultSource?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(defaultLatitude);
  const [lon, setLon] = useState<number | null>(defaultLongitude);
  const [source, setSource] = useState(defaultSource);
  const listId = useId();

  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ map: unknown; marker: unknown } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  /* What makes it feel instant. A fresh search costs about a second at the
     geocoder, so the box should rarely have to wait for one:
       - answers are remembered, so going back over a search is immediate;
       - while a longer query is out, the last answers that still match every
         word typed stay on screen, so "keri" → "kerich" never empties the list;
       - only the newest request counts — an older one finishing late cannot
         replace newer results;
       - a short debounce, because the provider counts requests, not intentions. */
  const cache = useRef(new Map<string, { results: Suggestion[]; unavailable: string | null }>());
  const lastResults = useRef<Suggestion[]>([]);
  const warmed = useRef(false);
  // The label just picked: putting it in the box must not reopen the list.
  const picked = useRef<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    const key = text.toLowerCase();
    if (picked.current === key) {
      picked.current = null;
      setSearching(false);
      return;
    }
    const hit = cache.current.get(key);
    if (hit) {
      setResults(hit.results);
      setUnavailable(hit.unavailable);
      setActive(0);
      setOpen(true);
      setSearching(false);
      return;
    }
    // Meanwhile: what we already have, narrowed to what still fits.
    const words = key.split(/\s+/).filter(Boolean);
    const still = lastResults.current.filter((r) =>
      words.every((w) => r.label.toLowerCase().includes(w)),
    );
    if (still.length) {
      setResults(still);
      setOpen(true);
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/geocode/suggest/?q=${encodeURIComponent(text)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        const found: Suggestion[] = data.results ?? [];
        const entry = { results: found, unavailable: data.unavailable ?? null };
        // Only a real answer is remembered; "unavailable" should be retried.
        if (!entry.unavailable) cache.current.set(key, entry);
        lastResults.current = found.length ? found : lastResults.current;
        setUnavailable(entry.unavailable);
        setResults(found);
        setActive(0);
        setOpen(true);
        setSearching(false);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setUnavailable('unreachable');
        setSearching(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  /* The first search pays for opening a connection to the API (over a second
     through the CDN). Opening it when the box is focused moves that cost to
     while the user is still thinking. A two-letter query never reaches the
     geocoder, so this costs nothing upstream. */
  const warm = useCallback(() => {
    if (warmed.current) return;
    warmed.current = true;
    fetch(`${API_BASE}/geocode/suggest/?q=`).catch(() => {});
  }, []);

  /* Leaflet only in the browser and only once mounted: it reaches for `window`
     on import, which is fatal during server rendering. */
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (disposed || !mapNode.current || mapRef.current) return;

      const centre: [number, number] = lat != null && lon != null ? [lat, lon] : FALLBACK_CENTRE;
      const map = L.map(mapNode.current).setView(centre, lat != null ? 15 : 11);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      /* Drawn, not Leaflet's stock PNG: that icon is referenced by a relative
         path bundlers rewrite and then fail to find, which shows up as an
         invisible marker — the commonest way this component breaks silently. */
      const icon = L.divIcon({
        className: '',
        html:
          '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;' +
          'transform:rotate(-45deg);background:#0f766e;border:2px solid #fff;' +
          'box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      });
      const marker = L.marker(centre, { draggable: true, icon }).addTo(map);
      const place = () => {
        const { lat: dLat, lng: dLon } = marker.getLatLng();
        setLat(dLat);
        setLon(dLon);
        setSource('pin');
      };
      marker.on('dragend', place);
      map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(event.latlng);
        place();
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

  /* A chosen suggestion moves the pin, rather than leaving it where the last
     one was and quietly disagreeing with the address above it. */
  useEffect(() => {
    if (!mapReady || lat == null || lon == null || !mapRef.current) return;
    const { map, marker } = mapRef.current as {
      map: { setView: (c: [number, number], z: number) => void };
      marker: { setLatLng: (c: [number, number]) => void };
    };
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon], 15);
  }, [lat, lon, mapReady]);

  const choose = useCallback((s: Suggestion) => {
    // The chosen label goes into the box without searching for it again.
    picked.current = s.label.trim().toLowerCase();
    setQuery(s.label);
    setOpen(false);
    setLat(s.latitude);
    setLon(s.longitude);
    setSource('geocoded');
  }, []);

  const clear = useCallback(() => {
    setLat(null);
    setLon(null);
    setSource('');
  }, []);

  return (
    <div className="space-y-2">
      {/* What actually submits. Empty strings when no point is set, which the
          payload builder reads back as "leave these columns alone". */}
      <input type="hidden" name={latitudeName} value={lat ?? ''} />
      <input type="hidden" name={longitudeName} value={lon ?? ''} />
      <input type="hidden" name={sourceName} value={lat != null && lon != null ? source : ''} />

      <p className="px-1 text-sm font-semibold text-light-primary-text font-public-sans">{label}</p>

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
            // default) — so "kericho⏎" is all it takes. Enter never submits
            // the surrounding form while the list is open.
            if (!open || results.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => (i - 1 + results.length) % results.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              choose(results[Math.min(active, results.length - 1)]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          aria-activedescendant={open && results.length ? `${listId}-${active}` : undefined}
          placeholder="Search an estate, road or landmark…"
          aria-label="Search for the warehouse location"
          aria-controls={listId}
          aria-expanded={open}
          role="combobox"
          autoComplete="off"
          className="h-11 w-full rounded-full border border-gray-300 pl-4 pr-10 text-sm text-light-primary-text focus:border-primary focus:outline-none font-public-sans"
        />
        {/* In the box, not under it: a line that appears and disappears below
            the field shifted the list (and the map) while you aimed at it. */}
        {searching && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-primary"
          />
        )}
        {open && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-300 bg-surface shadow-lg"
          >
            {results.map((s, i) => (
              <li key={`${s.label}-${i}`}>
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${i}`}
                  aria-selected={i === active}
                  // Chosen on press, not on release: the list closes on blur,
                  // and acting on mousedown makes the pick feel immediate.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`block w-full px-3 py-2 text-left text-sm text-light-primary-text transition-colors font-public-sans ${
                    i === active ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {unavailable && (
        /* Said plainly. A box that silently returns nothing reads as "this
           place does not exist". */
        <p className="px-1 text-xs text-light-secondary-text font-public-sans">
          Address search is unavailable right now — drop the pin on the map instead.
        </p>
      )}

      <div
        ref={mapNode}
        className="h-56 w-full overflow-hidden rounded-xl border border-gray-300"
        style={{ background: '#e8eef0' }}
        aria-label="Map. Click or drag the pin to set the warehouse location."
      />

      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-light-secondary-text font-public-sans">
          {lat != null && lon != null
            ? `Pin at ${lat.toFixed(5)}, ${lon.toFixed(5)} — ${source === 'pin' ? 'placed by hand' : 'from a search result'}.`
            : 'Search above, or click the map to place this warehouse.'}
        </p>
        {lat != null && lon != null && (
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-xs font-semibold text-light-secondary-text underline transition-colors hover:text-light-primary-text font-public-sans"
          >
            Clear pin
          </button>
        )}
      </div>
    </div>
  );
}
