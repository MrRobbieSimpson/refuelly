/**
 * Open Charge Map (https://openchargemap.org) — live EV charger lookup.
 *
 * Free API key: https://openchargemap.org/site/develop/apikey
 * Set OPENCHARGEMAP_API_KEY in .env.local
 */

export type EvChargerMatch = {
  nearby: number;
  maxKw: number | null;
  /** metres to nearest charger */
  distanceM: number | null;
  title: string | null;
  operator: string | null;
};

type OcmPoi = {
  ID?: number;
  AddressInfo?: {
    Title?: string;
    Latitude?: number;
    Longitude?: number;
    Distance?: number; // in requested unit (KM)
  };
  OperatorInfo?: { Title?: string | null };
  Connections?: { PowerKW?: number | null }[] | null;
};

function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function getOcmApiKey(): string | null {
  const key =
    process.env.OPENCHARGEMAP_API_KEY ||
    process.env.OCM_API_KEY ||
    process.env.NEXT_PUBLIC_OPENCHARGEMAP_API_KEY ||
    null;
  return key?.trim() || null;
}

/**
 * Fetch POIs in a radius around a point.
 * Distance is kilometres.
 */
async function fetchOcmNear(
  lat: number,
  lng: number,
  distanceKm: number,
  maxresults: number,
  apiKey: string,
): Promise<OcmPoi[]> {
  const url = new URL("https://api.openchargemap.io/v3/poi/");
  url.searchParams.set("output", "json");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("distance", String(distanceKm));
  url.searchParams.set("distanceunit", "KM");
  url.searchParams.set("maxresults", String(maxresults));
  url.searchParams.set("compact", "true");
  url.searchParams.set("verbose", "false");
  // key as query param is supported; header is preferred
  url.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Refuelly/1.0 (https://github.com/refuelly)",
        "X-API-Key": apiKey,
      },
      signal: controller.signal,
      next: { revalidate: 1800 }, // 30 min
    });
    if (!res.ok) {
      console.warn(`[ocm] HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as OcmPoi[];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("[ocm] fetch failed", e instanceof Error ? e.message : e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function brandTokens(name: string, brand?: string): string[] {
  const raw = `${brand || ""} ${name || ""}`.toLowerCase();
  const tokens = raw
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !["the", "and", "fuel", "mfg"].includes(t));
  return [...new Set(tokens)];
}

function poiMatchesBrand(poi: OcmPoi, tokens: string[]): boolean {
  if (!tokens.length) return false;
  const hay = `${poi.AddressInfo?.Title || ""} ${poi.OperatorInfo?.Title || ""}`.toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

/**
 * Match Open Charge Map chargers to stations by proximity.
 *
 * - Within `strictRadiusM` (default 220m): count as on-site / car park
 * - Within `brandRadiusM` (default 450m): count only if title/operator mentions brand
 *
 * When a key is configured, EV presence is driven by OCM ground truth.
 */
export async function enrichEvFromOpenChargeMap(
  stations: {
    id: string;
    name?: string;
    brand?: string;
    latitude: number | null;
    longitude: number | null;
  }[],
  opts?: { strictRadiusM?: number; brandRadiusM?: number },
): Promise<{
  matches: Map<string, EvChargerMatch>;
  /** true when API was called successfully with a key */
  usedOcm: boolean;
  error?: string;
}> {
  const matches = new Map<string, EvChargerMatch>();
  const apiKey = getOcmApiKey();
  if (!apiKey) {
    return {
      matches,
      usedOcm: false,
      error: "OPENCHARGEMAP_API_KEY not set",
    };
  }

  const withCoords = stations.filter(
    (s) => s.latitude != null && s.longitude != null,
  ) as {
    id: string;
    name?: string;
    brand?: string;
    latitude: number;
    longitude: number;
  }[];

  if (withCoords.length === 0) {
    return { matches, usedOcm: true };
  }

  // Strict: almost certainly on the forecourt / same site
  const strictRadiusM = opts?.strictRadiusM ?? 100;
  // Wider: only if charger title/operator mentions the fuel brand
  const brandRadiusM = opts?.brandRadiusM ?? 400;

  // Bounding box centre + diameter covering all stations + pad
  const lats = withCoords.map((s) => s.latitude);
  const lngs = withCoords.map((s) => s.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  let maxSpanM = 0;
  for (const s of withCoords) {
    maxSpanM = Math.max(
      maxSpanM,
      haversineMetres(centerLat, centerLng, s.latitude, s.longitude),
    );
  }
  const queryKm = Math.min(
    60,
    Math.max(1.5, (maxSpanM + brandRadiusM) / 1000 + 0.75),
  );

  // When stations are spread across a whole country, one bbox query is useless.
  // Fall back to per-station queries for sparse sets.
  const spreadKm = maxSpanM / 1000;
  let allPois: OcmPoi[] = [];

  if (spreadKm > 25 || withCoords.length <= 6) {
    // Per-station queries (more accurate for NI/IE spread)
    const batches = await Promise.all(
      withCoords.map((s) =>
        fetchOcmNear(s.latitude, s.longitude, brandRadiusM / 1000 + 0.2, 20, apiKey),
      ),
    );
    const seen = new Set<number>();
    for (const batch of batches) {
      for (const p of batch) {
        const id = p.ID ?? -1;
        if (id >= 0 && seen.has(id)) continue;
        if (id >= 0) seen.add(id);
        allPois.push(p);
      }
    }
  } else {
    allPois = await fetchOcmNear(
      centerLat,
      centerLng,
      queryKm,
      Math.min(250, Math.max(50, withCoords.length * 10)),
      apiKey,
    );
  }

  if (allPois.length === 0) {
    return { matches, usedOcm: true };
  }

  for (const s of withCoords) {
    const tokens = brandTokens(s.name || "", s.brand);
    let nearest: OcmPoi | null = null;
    let nearestM = Infinity;
    let count = 0;
    let maxKw: number | null = null;

    for (const poi of allPois) {
      const plat = poi.AddressInfo?.Latitude;
      const plng = poi.AddressInfo?.Longitude;
      if (plat == null || plng == null) continue;
      const d = haversineMetres(s.latitude, s.longitude, plat, plng);

      const inStrict = d <= strictRadiusM;
      const inBrand = d <= brandRadiusM && poiMatchesBrand(poi, tokens);
      if (!inStrict && !inBrand) continue;

      count += 1;
      if (d < nearestM) {
        nearestM = d;
        nearest = poi;
      }
      for (const c of poi.Connections || []) {
        if (c.PowerKW != null && Number.isFinite(c.PowerKW)) {
          maxKw = maxKw == null ? c.PowerKW : Math.max(maxKw, c.PowerKW);
        }
      }
    }

    if (count > 0 && nearest) {
      matches.set(s.id, {
        nearby: count,
        maxKw,
        distanceM: Math.round(nearestM),
        title: nearest.AddressInfo?.Title ?? null,
        operator: nearest.OperatorInfo?.Title ?? null,
      });
    }
  }

  return { matches, usedOcm: true };
}
