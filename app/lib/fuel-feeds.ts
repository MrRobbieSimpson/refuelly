/** Public UK retailer fuel-price JSON feeds (open data) + IE FuelFinder. */

import type { Amenities } from "./amenities";
import { amenitiesFromBrand } from "./amenities";

export type RawFeedStation = {
  site_id?: string;
  brand?: string;
  address?: string;
  postcode?: string;
  location?: { latitude?: number; longitude?: number };
  prices?: Record<string, number | string | null | undefined>;
};

export type FeedPayload = {
  last_updated?: string;
  stations?: RawFeedStation[];
};

export type LiveStation = {
  id: string;
  name: string;
  brand: string;
  address: string;
  postcode: string;
  /** Display number: GBP pence/L or EUR cents/L depending on priceCurrency */
  unleaded: string;
  diesel: string;
  /** Native currency of the price numbers */
  priceCurrency: "GBP" | "EUR";
  country: "GB" | "IE";
  latitude: number | null;
  longitude: number | null;
  contactless: boolean;
  ev: boolean;
  amenities: Amenities;
  /** Populated when Open Charge Map finds a charger nearby */
  evDetails?: {
    nearby: number;
    maxKw: number | null;
    distanceM: number | null;
    title?: string | null;
    operator?: string | null;
  } | null;
  featured?: boolean;
  source: string;
  updatedAt: string | null;
  osmId?: string | null;
};

export const FUEL_FEEDS: { id: string; url: string }[] = [
  {
    id: "asda",
    url: "https://storelocator.asda.com/fuel_prices_data.json",
  },
  {
    id: "tesco",
    url: "https://www.tesco.com/fuel_prices/fuel_prices_data.json",
  },
  {
    id: "mfg",
    url: "https://fuel.motorfuelgroup.com/fuel_prices_data.json",
  },
  {
    id: "applegreen",
    url: "https://applegreenstores.com/fuel-prices/data.json",
  },
];

/** Haversine distance in miles */
export function milesBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function pickPrice(
  prices: Record<string, number | string | null | undefined> | undefined,
  keys: string[],
): number | null {
  if (!prices) return null;
  for (const key of keys) {
    const raw = prices[key];
    if (raw == null || raw === "") continue;
    const n = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (Number.isFinite(n) && n > 0) return n;
  }
  // case-insensitive fallback
  const lower = Object.fromEntries(
    Object.entries(prices).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const raw = lower[key.toLowerCase()];
    if (raw == null || raw === "") continue;
    const n = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function formatPence(n: number): string {
  // Feeds use pence-per-litre (e.g. 148.7). If a feed ever returns £/L, scale.
  const pence = n < 10 ? n * 100 : n;
  return pence.toFixed(1);
}

function titleCaseBrand(brand: string): string {
  if (!brand) return "Station";
  const upper = brand.toUpperCase();
  const keep = new Set(["BP", "MFG", "EV", "ESSO", "JET", "TEXACO", "TOTAL"]);
  if (keep.has(upper)) return upper === "ESSO" ? "Esso" : upper;
  if (upper === "TESCO") return "Tesco";
  if (upper === "ASDA") return "Asda";
  return brand
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function stationName(brand: string, address: string): string {
  const b = titleCaseBrand(brand);
  const first = (address.split(",")[0] || "").trim();
  // MFG sites encode the site name in the address, e.g. "MFG Vauxhall Bridge, …"
  if (/^mfg\s+/i.test(first)) {
    return first.replace(/^mfg\s+/i, "MFG ").trim();
  }
  if (first.toLowerCase().startsWith(b.toLowerCase()) && first.length > b.length + 2) {
    return first;
  }
  // Asda Express etc.
  if (first && /express|garage|service/i.test(first) && first.length < 48) {
    return first;
  }
  return b;
}

function formatAddress(address: string, postcode: string): string {
  const clean = address
    .replace(/\s+/g, " ")
    .replace(/Tesco Stores Ltd\s*/i, "")
    .trim();
  // "Street · City · POSTCODE" style — use last comma parts + postcode
  const parts = clean.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} · ${parts[parts.length - 1]}${postcode ? "" : ""}`;
  }
  if (postcode) return `${clean} · ${postcode}`;
  return clean;
}

export function normalizeStation(
  raw: RawFeedStation,
  source: string,
  updatedAt: string | null,
): LiveStation | null {
  const unleadedN = pickPrice(raw.prices, ["E10", "E5", "unleaded", "petrol"]);
  const dieselN = pickPrice(raw.prices, ["B7", "SDV", "diesel", "B10"]);
  if (unleadedN == null && dieselN == null) return null;

  const brand = (raw.brand || source).trim();
  const address = (raw.address || "").trim();
  const postcode = (raw.postcode || "").trim().toUpperCase();
  const lat = raw.location?.latitude ?? null;
  const lng = raw.location?.longitude ?? null;

  const id = raw.site_id || `${source}-${postcode}-${address}`.slice(0, 80);
  const displayName = stationName(brand, address);
  const displayBrand = titleCaseBrand(brand);
  const amenities = amenitiesFromBrand(displayBrand, displayName, address);

  return {
    id,
    name: displayName,
    brand: displayBrand,
    address: formatAddress(address, postcode),
    postcode,
    unleaded: unleadedN != null ? formatPence(unleadedN) : "—",
    diesel: dieselN != null ? formatPence(dieselN) : "—",
    priceCurrency: "GBP",
    country: "GB",
    latitude: typeof lat === "number" ? lat : null,
    longitude: typeof lng === "number" ? lng : null,
    contactless: amenities.contactless,
    ev: amenities.ev,
    amenities,
    source,
    updatedAt,
  };
}

// ── Republic of Ireland (FuelFinder.ie — crowd-sourced, public JSON) ─────────

const IE_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://www.fuelfinder.ie/fuelfinder",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
};

type IEFuelFinderStation = {
  id?: string;
  name?: string;
  brand?: string;
  street?: string;
  county?: string;
  lat?: number;
  lng?: number;
  price?: number | null;
  updated_at?: string | null;
  has_price?: boolean;
  confidence?: string | null;
  osm_id?: string | number | null;
};

/** County / city slugs accepted by FuelFinder.ie `city=` param */
export const IE_CITY_HINTS: Record<string, string> = {
  dublin: "dublin",
  cork: "cork",
  galway: "galway",
  limerick: "limerick",
  waterford: "waterford",
  kerry: "kerry",
  mayo: "mayo",
  donegal: "donegal",
  clare: "clare",
  tipperary: "tipperary",
  wexford: "wexford",
  kilkenny: "kilkenny",
  wicklow: "wicklow",
  kildare: "kildare",
  meath: "meath",
  louth: "louth",
  cavan: "cavan",
  monaghan: "monaghan",
  sligo: "sligo",
  roscommon: "roscommon",
  leitrim: "leitrim",
  longford: "longford",
  westmeath: "westmeath",
  offaly: "offaly",
  laois: "laois",
  carlow: "carlow",
  ireland: "ireland",
  eire: "ireland",
  roi: "ireland",
};

export function detectIrelandCity(query?: string): string | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // Eircode routing keys start with letter + 2 digits (e.g. D02, T12, A94)
  if (/^[a-z]\d{2}/i.test(q.replace(/\s+/g, ""))) {
    const key = q.replace(/\s+/g, "")[0].toUpperCase();
    // Rough eircode → county routing (simplified)
    const eirMap: Record<string, string> = {
      D: "dublin",
      A: "wicklow",
      C: "cork",
      T: "tipperary",
      V: "limerick",
      H: "galway",
      F: "mayo",
      N: "meath",
      R: "waterford",
      P: "cork",
      Y: "cork",
      X: "waterford",
      W: "waterford",
      E: "tipperary",
      G: "limerick",
      K: "kildare",
    };
    return eirMap[key] || "ireland";
  }
  for (const [hint, city] of Object.entries(IE_CITY_HINTS)) {
    if (q === hint || q.includes(hint)) return city;
  }
  return null;
}

async function fetchIEFuelType(
  city: string,
  fuel: "petrol" | "diesel",
): Promise<{ stations: IEFuelFinderStation[]; error?: string }> {
  try {
    const url = `https://www.fuelfinder.ie/api/fuelfinder/stations?city=${encodeURIComponent(city)}&fuel=${fuel}`;
    const res = await fetch(url, {
      headers: IE_HEADERS,
      next: { revalidate: 900 },
    });
    if (!res.ok) {
      return { stations: [], error: `ie-fuelfinder HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      stations?: IEFuelFinderStation[];
    };
    return { stations: data.stations ?? [] };
  } catch (e) {
    return {
      stations: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** EUR/L → euro-cents string for display (e.g. 1.699 → "169.9") */
function formatEuroCents(eurPerLitre: number): string {
  return (eurPerLitre * 100).toFixed(1);
}

export async function fetchIrelandStations(
  city = "ireland",
): Promise<{ stations: LiveStation[]; updatedAt: string | null; error?: string }> {
  const [petrol, diesel] = await Promise.all([
    fetchIEFuelType(city, "petrol"),
    fetchIEFuelType(city, "diesel"),
  ]);

  if (petrol.error && diesel.error) {
    return {
      stations: [],
      updatedAt: null,
      error: petrol.error || diesel.error,
    };
  }

  type Acc = {
    meta: IEFuelFinderStation;
    unleaded?: number;
    diesel?: number;
    updatedAt?: string | null;
  };
  const byId = new Map<string, Acc>();

  for (const s of petrol.stations) {
    if (!s.id || s.price == null || !s.has_price) continue;
    byId.set(s.id, {
      meta: s,
      unleaded: s.price,
      updatedAt: s.updated_at,
    });
  }
  for (const s of diesel.stations) {
    if (!s.id || s.price == null || !s.has_price) continue;
    const existing = byId.get(s.id);
    if (existing) {
      existing.diesel = s.price;
      // keep newest timestamp
      if (s.updated_at && (!existing.updatedAt || s.updated_at > existing.updatedAt)) {
        existing.updatedAt = s.updated_at;
      }
    } else {
      byId.set(s.id, {
        meta: s,
        diesel: s.price,
        updatedAt: s.updated_at,
      });
    }
  }

  const stations: LiveStation[] = [];
  let newest: string | null = null;

  for (const [id, acc] of byId) {
    if (acc.unleaded == null && acc.diesel == null) continue;
    const m = acc.meta;
    const brand = (m.brand || m.name || "Station").trim();
    const name = (m.name || brand).trim();
    const street = (m.street || "").trim();
    const county = (m.county || "").trim();
    const addressParts = [street, county].filter(Boolean);

    if (acc.updatedAt && (!newest || acc.updatedAt > newest)) {
      newest = acc.updatedAt;
    }

    const displayBrand = titleCaseBrand(brand);
    const amenityBase = amenitiesFromBrand(
      displayBrand,
      name,
      addressParts.join(" "),
    );
    stations.push({
      id: `ie-${id}`,
      name,
      brand: displayBrand,
      address: addressParts.join(" · ") || county || "Ireland",
      postcode: county, // use county as secondary location label
      unleaded: acc.unleaded != null ? formatEuroCents(acc.unleaded) : "—",
      diesel: acc.diesel != null ? formatEuroCents(acc.diesel) : "—",
      priceCurrency: "EUR",
      country: "IE",
      latitude: typeof m.lat === "number" ? m.lat : null,
      longitude: typeof m.lng === "number" ? m.lng : null,
      contactless: amenityBase.contactless,
      ev: amenityBase.ev,
      amenities: amenityBase,
      osmId: m.osm_id != null ? String(m.osm_id) : null,
      source: "ie-fuelfinder",
      updatedAt: acc.updatedAt ?? null,
    });
  }

  return { stations, updatedAt: newest };
}

export async function fetchFeed(
  feed: { id: string; url: string },
): Promise<{ stations: LiveStation[]; updatedAt: string | null; error?: string }> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Refuelly/1.0 (local demo; fuel price aggregator)",
      },
      // Cache at the Next fetch layer
      next: { revalidate: 900 },
    });
    if (!res.ok) {
      return {
        stations: [],
        updatedAt: null,
        error: `${feed.id} HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as FeedPayload;
    const updatedAt = data.last_updated ?? null;
    const stations = (data.stations ?? [])
      .map((s) => normalizeStation(s, feed.id, updatedAt))
      .filter((s): s is LiveStation => s != null);
    return { stations, updatedAt };
  } catch (e) {
    return {
      stations: [],
      updatedAt: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function fetchAllStations(opts?: {
  irelandCity?: string;
}): Promise<{
  stations: LiveStation[];
  sources: { id: string; count: number; updatedAt: string | null; error?: string }[];
}> {
  const ieCity = opts?.irelandCity || "ireland";
  const [ukResults, ieResult] = await Promise.all([
    Promise.all(FUEL_FEEDS.map(fetchFeed)),
    fetchIrelandStations(ieCity),
  ]);

  const sources = [
    ...ukResults.map((r, i) => ({
      id: FUEL_FEEDS[i].id,
      count: r.stations.length,
      updatedAt: r.updatedAt,
      error: r.error,
    })),
    {
      id: "ie-fuelfinder",
      count: ieResult.stations.length,
      updatedAt: ieResult.updatedAt,
      error: ieResult.error,
    },
  ];
  const stations = [
    ...ukResults.flatMap((r) => r.stations),
    ...ieResult.stations,
  ];
  return { stations, sources };
}

export type Region = "uk" | "ni" | "ie";

/** Classify a station into UK (GB mainland), NI, or ROI */
export function stationRegion(s: LiveStation): Region {
  if (s.country === "IE") return "ie";
  const pc = (s.postcode || "").toUpperCase().replace(/\s+/g, "");
  if (pc.startsWith("BT")) return "ni";
  // FuelFinder sometimes lists NI counties under IE country with empty eircode
  const addr = `${s.address} ${s.postcode}`.toLowerCase();
  if (
    /\b(antrim|armagh|down|fermanagh|tyrone|belfast|derry|londonderry|lisburn|newry)\b/.test(
      addr,
    )
  ) {
    return "ni";
  }
  return "uk";
}

export function filterStations(
  stations: LiveStation[],
  opts: {
    postcode?: string;
    q?: string;
    lat?: number;
    lng?: number;
    radiusMiles?: number;
    limit?: number;
    region?: Region;
  },
): LiveStation[] {
  let list = stations;
  const pc = opts.postcode?.trim().toUpperCase().replace(/\s+/g, "");
  const q = opts.q?.trim().toLowerCase();

  if (opts.region) {
    list = list.filter((s) => stationRegion(s) === opts.region);
  }

  if (pc) {
    // Match full or outward code (e.g. BT4, BT23)
    list = list.filter((s) => {
      const sp = s.postcode.replace(/\s+/g, "");
      return sp.startsWith(pc) || pc.startsWith(sp.slice(0, 3));
    });
  }

  if (q) {
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.brand.toLowerCase().includes(q) ||
        s.postcode.toLowerCase().includes(q),
    );
  }

  if (
    opts.lat != null &&
    opts.lng != null &&
    Number.isFinite(opts.lat) &&
    Number.isFinite(opts.lng)
  ) {
    const radius = opts.radiusMiles ?? 15;
    list = list
      .map((s) => {
        if (s.latitude == null || s.longitude == null) {
          return { s, d: Number.POSITIVE_INFINITY };
        }
        return {
          s,
          d: milesBetween(opts.lat!, opts.lng!, s.latitude, s.longitude),
        };
      })
      .filter((x) => x.d <= radius)
      .sort((a, b) => a.d - b.d || parseFloat(a.s.unleaded) - parseFloat(b.s.unleaded))
      .map((x) => x.s);
  } else {
    // Prefer cheapest unleaded when no geo sort
    list = [...list].sort((a, b) => {
      const pa = parseFloat(a.unleaded);
      const pb = parseFloat(b.unleaded);
      if (Number.isFinite(pa) && Number.isFinite(pb)) return pa - pb;
      return a.name.localeCompare(b.name);
    });
  }

  const limit = opts.limit ?? 24;
  return list.slice(0, limit).map((s, i) => ({
    ...s,
    featured: i === 0,
  }));
}

function labelFromGeo(r: Record<string, unknown>): string {
  const pick = (v: unknown): string | null => {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    return null;
  };
  return (
    pick(r.admin_district) ||
    pick(r.parish) ||
    pick(r.region) ||
    pick(r.outcode) ||
    "Nearby"
  );
}

/** Geocode a UK postcode via free postcodes.io */
export async function geocodePostcode(
  postcode: string,
): Promise<{ lat: number; lng: number; adminDistrict?: string } | null> {
  const clean = postcode.trim().replace(/\s+/g, "");
  if (!clean) return null;
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      // try partial / outward
      const res2 = await fetch(
        `https://api.postcodes.io/outcodes/${encodeURIComponent(clean)}`,
        { next: { revalidate: 86400 } },
      );
      if (!res2.ok) return null;
      const data2 = await res2.json();
      const r = data2?.result;
      if (!r) return null;
      return {
        lat: r.latitude,
        lng: r.longitude,
        adminDistrict: labelFromGeo(r),
      };
    }
    const data = await res.json();
    const r = data?.result;
    if (!r) return null;
    return {
      lat: r.latitude,
      lng: r.longitude,
      adminDistrict: labelFromGeo(r),
    };
  } catch {
    return null;
  }
}

/** Geocode free-text place (Ireland-friendly) via OpenStreetMap Nominatim */
export async function geocodePlace(
  query: string,
  opts?: { countrycodes?: string },
): Promise<{ lat: number; lng: number; adminDistrict?: string } | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    // Prefer towns/cities over stadiums, shops, etc.
    url.searchParams.set("limit", "5");
    url.searchParams.set(
      "countrycodes",
      opts?.countrycodes || "gb,ie",
    );
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Refuelly/1.0 (local fuel price demo)",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      lat: string;
      lon: string;
      display_name?: string;
      class?: string;
      type?: string;
      importance?: number;
      address?: Record<string, string>;
    }[];
    if (!data?.length) return null;

    // Prefer place/boundary settlements over amenity/tourism/leisure (e.g. "Liverpool FC")
    const placeRank = (row: (typeof data)[0]) => {
      const cls = row.class || "";
      const typ = row.type || "";
      if (cls === "place" && ["city", "town", "municipality", "village", "hamlet", "suburb"].includes(typ))
        return 100 + (row.importance || 0);
      if (cls === "boundary" && typ === "administrative") return 80 + (row.importance || 0);
      if (cls === "place") return 50 + (row.importance || 0);
      if (cls === "highway" || cls === "amenity" || cls === "leisure" || cls === "tourism")
        return 0;
      return 10 + (row.importance || 0);
    };

    const best = [...data].sort((a, b) => placeRank(b) - placeRank(a))[0];
    if (!best || placeRank(best) <= 0) {
      // fall back to first result if nothing ranked well
      const lat0 = parseFloat(data[0].lat);
      const lng0 = parseFloat(data[0].lon);
      if (!Number.isFinite(lat0) || !Number.isFinite(lng0)) return null;
      return {
        lat: lat0,
        lng: lng0,
        adminDistrict: data[0].display_name?.split(",")[0]?.trim() || q,
      };
    }

    const lat = parseFloat(best.lat);
    const lng = parseFloat(best.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const addr = best.address || {};
    const label =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.city_district ||
      best.display_name?.split(",")[0]?.trim() ||
      q;

    return { lat, lng, adminDistrict: label };
  } catch {
    return null;
  }
}

/** Infer UK / NI / IE from WGS84 coordinates */
export function regionFromCoords(lat: number, lng: number): Region {
  // Republic of Ireland (approx) — west of NI and south of Donegal nuances simplified
  // NI box
  if (lat >= 54.0 && lat <= 55.35 && lng >= -8.25 && lng <= -5.4) {
    // Donegal is ROI but overlaps west — if west of ~-7.5 and north, could be Donegal
    if (lng < -7.6 && lat > 54.5) {
      // likely Donegal / border ROI
      return "ie";
    }
    return "ni";
  }
  // Ireland island rough
  if (lat >= 51.3 && lat <= 55.5 && lng >= -10.7 && lng <= -5.9) {
    return "ie";
  }
  return "uk";
}

/** Approximate GBP↔EUR for tab switching (pence ↔ euro-cents) */
export const EUR_PER_GBP = 1.17;
