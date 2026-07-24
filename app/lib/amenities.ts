/**
 * Amenity inference for fuel stations.
 *
 * Retailer price feeds do not publish amenities. We combine:
 * 1. Brand profiles (typical forecourt features for major UK/IE chains)
 * 2. Optional OpenStreetMap tags when available
 */

export type Amenities = {
  contactless: boolean;
  ev: boolean;
  shop: boolean;
  carWash: boolean;
  toilets: boolean;
  atm: boolean;
  open24h: boolean;
};

export const EMPTY_AMENITIES: Amenities = {
  contactless: false,
  ev: false,
  shop: false,
  carWash: false,
  toilets: false,
  atm: false,
  open24h: false,
};

type BrandProfile = Partial<Amenities> & { match: RegExp };

/**
 * Typical amenities by brand / operator.
 * Prefer conservative EV flags (only chains with known widespread chargers).
 */
const BRAND_PROFILES: BrandProfile[] = [
  {
    match: /\basda\b/i,
    contactless: true,
    shop: true,
    toilets: true,
    atm: true,
    carWash: true,
    ev: true, // Asda EV / partners at many sites
  },
  {
    match: /\btesco\b/i,
    contactless: true,
    shop: true,
    toilets: true,
    atm: true,
    carWash: true,
    ev: true, // Tesco / Pod Point common
  },
  {
    match: /\bsainsbury/i,
    contactless: true,
    shop: true,
    toilets: true,
    atm: true,
    carWash: true,
    ev: true,
  },
  {
    match: /\bmorrisons?\b/i,
    contactless: true,
    shop: true,
    toilets: true,
    atm: true,
    carWash: true,
  },
  {
    match: /\b(bp|mfg)\b/i,
    contactless: true,
    shop: true,
    toilets: true,
    atm: true,
    carWash: true,
    ev: true, // bp pulse
  },
  {
    match: /\bshell\b/i,
    contactless: true,
    shop: true,
    toilets: true,
    atm: true,
    carWash: true,
    ev: true, // Shell Recharge
  },
  {
    match: /\besso\b/i,
    contactless: true,
    shop: true,
    toilets: true,
    carWash: true,
  },
  {
    match: /\bjet\b/i,
    contactless: true,
    shop: true,
    toilets: true,
  },
  {
    match: /\btexaco\b/i,
    contactless: true,
    shop: true,
    toilets: true,
  },
  {
    match: /\bcircle\s*k\b/i,
    contactless: true,
    shop: true,
    toilets: true,
    atm: true,
    open24h: true,
    carWash: true,
    ev: true,
  },
  {
    match: /\bapple\s*green\b/i,
    contactless: true,
    shop: true,
    toilets: true,
    atm: true,
    open24h: true,
    carWash: true,
    ev: true,
  },
  {
    match: /\bmaxol\b/i,
    contactless: true,
    shop: true,
    toilets: true,
  },
  {
    match: /\bemo\b/i,
    contactless: true,
    shop: true,
  },
  {
    match: /\binver\b/i,
    contactless: true,
    shop: true,
  },
  {
    match: /\bgo\b/i,
    contactless: true,
    shop: true,
  },
  {
    match: /\btop(\s*oil)?\b/i,
    contactless: true,
    shop: true,
  },
  {
    match: /\bgridserve\b/i,
    contactless: true,
    ev: true,
    shop: true,
    toilets: true,
  },
  {
    match: /\binstavolt|pod\s*point|ionity|osprey\b/i,
    contactless: true,
    ev: true,
  },
];

/** Default for unknown independents — contactless is near-universal at pumps now */
const DEFAULT_UNKNOWN: Partial<Amenities> = {
  contactless: true,
};

export function amenitiesFromBrand(
  brand: string,
  name: string,
  address = "",
): Amenities {
  const haystack = `${brand} ${name} ${address}`;
  const out: Amenities = { ...EMPTY_AMENITIES, ...DEFAULT_UNKNOWN };

  for (const profile of BRAND_PROFILES) {
    if (profile.match.test(haystack)) {
      const { match: _m, ...flags } = profile;
      return { ...out, ...flags };
    }
  }
  return out;
}

/** Parse OSM tags into amenity flags (only sets true when explicit) */
export function amenitiesFromOsmTags(
  tags: Record<string, string> | undefined,
): Partial<Amenities> {
  if (!tags) return {};
  const yes = (v: string | undefined) =>
    !!v && /^(yes|true|1|only|customers|designated)$/i.test(v);

  const out: Partial<Amenities> = {};

  if (
    yes(tags["payment:contactless"]) ||
    yes(tags["payment:credit_cards"]) ||
    yes(tags["payment:debit_cards"]) ||
    yes(tags["payment:mastercard"]) ||
    yes(tags["payment:visa"])
  ) {
    out.contactless = true;
  }

  // EV on the fuel site or dedicated sockets
  if (yes(tags["fuel:electricity"]) || tags.amenity === "charging_station") {
    out.ev = true;
  }
  if (Object.keys(tags).some((k) => k.startsWith("socket:") && tags[k])) {
    out.ev = true;
  }

  if (yes(tags.shop) || tags.shop === "convenience" || tags.shop === "yes") {
    out.shop = true;
  }
  if (yes(tags.car_wash) || tags.car_wash) out.carWash = true;
  if (yes(tags.toilets) || tags.toilets === "yes") out.toilets = true;
  if (yes(tags.atm) || tags.atm === "yes") out.atm = true;

  const oh = tags.opening_hours || "";
  if (/24\/7|00:00-24:00|00:00-00:00/i.test(oh)) out.open24h = true;

  return out;
}

export function mergeAmenities(
  base: Amenities,
  ...extras: Partial<Amenities>[]
): Amenities {
  const out = { ...base };
  for (const e of extras) {
    for (const key of Object.keys(EMPTY_AMENITIES) as (keyof Amenities)[]) {
      if (e[key] === true) out[key] = true;
    }
  }
  return out;
}

/**
 * Best-effort OSM enrichment for a small set of stations.
 * Single batched Overpass query; fails soft on timeout/error.
 */
export async function enrichAmenitiesFromOsm(
  stations: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    osmId?: string | null;
  }[],
): Promise<Map<string, Partial<Amenities>>> {
  const result = new Map<string, Partial<Amenities>>();
  const withCoords = stations.filter(
    (s) => s.latitude != null && s.longitude != null,
  );
  if (withCoords.length === 0) return result;

  // Cap query size for latency
  const sample = withCoords.slice(0, 12);

  const parts: string[] = [];
  for (const s of sample) {
    parts.push(
      `node["amenity"="fuel"](around:120,${s.latitude},${s.longitude});`,
    );
    parts.push(
      `way["amenity"="fuel"](around:120,${s.latitude},${s.longitude});`,
    );
    parts.push(
      `node["amenity"="charging_station"](around:150,${s.latitude},${s.longitude});`,
    );
  }

  const query = `[out:json][timeout:20];(${parts.join("")});out tags center;`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Refuelly/1.0 (fuel amenities enrichment)",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);
    if (!res.ok) return result;

    const data = (await res.json()) as {
      elements?: {
        type: string;
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }[];
    };

    const elements = data.elements ?? [];

    for (const s of sample) {
      const lat = s.latitude!;
      const lng = s.longitude!;
      let best: (typeof elements)[0] | null = null;
      let bestDist = Infinity;
      let hasChargerNearby = false;

      for (const el of elements) {
        const elat = el.lat ?? el.center?.lat;
        const elng = el.lon ?? el.center?.lon;
        if (elat == null || elng == null) continue;
        const d =
          (elat - lat) * (elat - lat) + (elng - lng) * (elng - lng);
        const amenity = el.tags?.amenity;
        if (amenity === "charging_station" && d < 0.00002) {
          // ~150m rough
          hasChargerNearby = true;
        }
        if (amenity === "fuel" && d < bestDist) {
          bestDist = d;
          best = el;
        }
      }

      const fromTags = amenitiesFromOsmTags(best?.tags);
      if (hasChargerNearby) fromTags.ev = true;
      if (Object.keys(fromTags).length) {
        result.set(s.id, fromTags);
      }
    }
  } catch {
    // soft fail — brand profiles still apply
  }

  return result;
}
