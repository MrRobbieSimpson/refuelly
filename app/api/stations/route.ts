import { NextRequest, NextResponse } from "next/server";
import {
  enrichAmenitiesFromOsm,
  mergeAmenities,
} from "../../lib/amenities";
import {
  detectIrelandCity,
  fetchAllStations,
  filterStations,
  geocodePlace,
  geocodePostcode,
  regionFromCoords,
  type Region,
} from "../../lib/fuel-feeds";

/** Town/city search radius — all stations within this distance */
const PLACE_RADIUS_MILES = 20;
/** Max stations to return for a place search (all within radius, capped) */
const PLACE_LIMIT = 48;
import {
  enrichEvFromOpenChargeMap,
  getOcmApiKey,
} from "../../lib/openchargemap";

export const revalidate = 900; // 15 minutes

const DEFAULTS: Record<
  Region,
  { postcode?: string; place?: string; label: string; currency: "gbp" | "eur" }
> = {
  ni: { postcode: "BT4", label: "Outer Belfast", currency: "gbp" },
  uk: { postcode: "M1", label: "United Kingdom", currency: "gbp" },
  ie: { place: "Dublin, Ireland", label: "Ireland", currency: "eur" },
};

/** NI towns/cities — map search here, don't treat as free-text brand match */
const NI_PLACE_RE =
  /\b(belfast|lisburn|newry|derry|londonderry|bangor|newtownards|antrim|armagh|omagh|enniskillen|coleraine|ballymena|craigavon|portadown|larne|carrickfergus|holywood|downpatrick|strabane|limavady|ballyclare|cookstown|dungannon|newcastle|warrenpoint|porteferry|ballymoney|magherafelt|castlereagh|newtownabbey)\b/i;

/** Common fuel brands for text search */
const BRAND_RE =
  /\b(asda|tesco|shell|bp|esso|mfg|jet|apple\s*green|applegreen|circle\s*k|maxol|emo|sainsbury'?s?|morrisons?|texaco|inver|top\s*oil|go\s*garage)\b/i;

function parseRegion(raw: string | null): Region {
  const v = (raw || "").toLowerCase();
  if (v === "uk" || v === "gb") return "uk";
  if (v === "ie" || v === "ireland" || v === "roi") return "ie";
  if (v === "ni" || v === "northern-ireland") return "ni";
  return "ni";
}

function looksLikeUkPostcode(q: string): boolean {
  const compact = q.trim().replace(/\s+/g, "").toUpperCase();
  // UK outward+inward e.g. BT4 2PW, M1 1AE, SW1A 1AA
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i.test(compact) &&
      !/^[A-Z]{1,2}\d[A-Z\d]?$/i.test(compact)) {
    return false;
  }
  // Eircode routing keys are like D02 — single letter + 2 digits only
  if (/^[A-Z]\d{2}$/i.test(compact)) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const qRaw = (searchParams.get("q") || "").trim();
  const postcodeParam = searchParams.get("postcode")?.trim();
  let region = parseRegion(searchParams.get("region"));

  const requestedLimit = Math.min(
    48,
    Math.max(1, parseInt(searchParams.get("limit") || "24", 10) || 24),
  );
  const radiusMiles = Math.min(
    50,
    Math.max(
      1,
      parseFloat(searchParams.get("radius") || String(PLACE_RADIUS_MILES)) ||
        PLACE_RADIUS_MILES,
    ),
  );

  let postcode = postcodeParam || undefined;
  let placeQuery: string | undefined; // geocode as a town/city
  let brandQuery: string | undefined; // filter by brand/name text
  let ieCity: string | undefined;

  const q = qRaw || undefined;
  const ieCityFromQuery = detectIrelandCity(q) || detectIrelandCity(postcode);

  // ── Classify the search ──────────────────────────────────────────────
  if (ieCityFromQuery) {
    region = "ie";
    ieCity = ieCityFromQuery;
    placeQuery = ieCity === "ireland" ? "Dublin, Ireland" : `${ieCity}, Ireland`;
  } else if (q && NI_PLACE_RE.test(q)) {
    region = "ni";
    placeQuery = `${q}, Northern Ireland`;
  } else if (postcode || (q && looksLikeUkPostcode(q))) {
    postcode = postcode || q;
    if (postcode!.toUpperCase().replace(/\s+/g, "").startsWith("BT")) {
      region = "ni";
    } else {
      region = "uk";
    }
  } else if (q && BRAND_RE.test(q)) {
    // Brand search — keep current region tab, text-filter brands
    brandQuery = q;
  } else if (q) {
    // Unknown free text: treat as place (city/town) first
    placeQuery = q;
  }

  if (region === "ie" && !ieCity) {
    ieCity = "ireland";
  }

  const { stations: all, sources } = await fetchAllStations({
    irelandCity: ieCity || "ireland",
  });

  let lat: number | undefined;
  let lng: number | undefined;
  let areaLabel = DEFAULTS[region].label;
  let placeResolved = false;

  // ── Geocode postcode ─────────────────────────────────────────────────
  if (postcode && region !== "ie") {
    const geo = await geocodePostcode(postcode);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
      areaLabel = geo.adminDistrict || postcode.toUpperCase();
      placeResolved = true;
    }
  }

  // ── Geocode place / town / city ──────────────────────────────────────
  if ((lat == null || lng == null) && placeQuery) {
    // Prefer region-qualified queries so "Belfast" hits NI not Maine, etc.
    const candidates =
      region === "ni"
        ? [`${placeQuery.replace(/,.*$/, "")}, Northern Ireland`, placeQuery, `${placeQuery}, UK`]
        : region === "ie"
          ? [placeQuery.includes("Ireland") ? placeQuery : `${placeQuery}, Ireland`]
          : [
              `${placeQuery.replace(/,.*$/, "")}, UK`,
              `${placeQuery.replace(/,.*$/, "")}, England`,
              placeQuery,
            ];

    for (const candidate of candidates) {
      const geo = await geocodePlace(candidate);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        // Prefer a clean label: "Belfast" not the full nominatim string
        const short = placeQuery.replace(/,.*/, "").trim();
        areaLabel =
          geo.adminDistrict &&
          geo.adminDistrict.toLowerCase().includes(short.toLowerCase())
            ? geo.adminDistrict
            : short.replace(/\b\w/g, (c) => c.toUpperCase());
        placeResolved = true;

        // Infer region from coordinates if still ambiguous
        // NI rough bbox
        if (
          region === "uk" &&
          lat >= 54.0 &&
          lat <= 55.4 &&
          lng >= -8.3 &&
          lng <= -5.4
        ) {
          region = "ni";
        }
        break;
      }
    }
  }

  // ── Defaults when no search ──────────────────────────────────────────
  if (lat == null || lng == null) {
    if (region === "ie") {
      const geo = await geocodePlace(DEFAULTS.ie.place || "Dublin, Ireland");
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    } else {
      const geo = await geocodePostcode(
        postcode || DEFAULTS[region].postcode || "BT4",
      );
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        if (!q && !postcode) areaLabel = DEFAULTS[region].label;
      }
    }
  }

  // Town/city → fixed ~20 mile radius, return everything in range
  // Brand → wider text search within active region
  // Default tab → normal region browse
  const searchRadius = placeResolved
    ? PLACE_RADIUS_MILES
    : brandQuery
      ? Math.max(radiusMiles, 40)
      : radiusMiles;

  const resultLimit = placeResolved
    ? PLACE_LIMIT
    : brandQuery
      ? Math.max(requestedLimit, 24)
      : requestedLimit;

  // ── Filter stations ──────────────────────────────────────────────────
  // Place search: distance-only (no region tab filter, no city name text match).
  // Addresses often omit the city (e.g. "Park Street · Ballyclare" near Belfast).
  let stations = filterStations(all, {
    q: brandQuery, // brand text only — never city name
    lat,
    lng,
    radiusMiles: searchRadius,
    limit: resultLimit,
    // Place searches ignore the UK/NI/IE tab so "Belfast" works from any tab
    region: placeResolved ? undefined : region,
  });

  // Infer region from the place we found (for currency / UI tabs)
  if (placeResolved && lat != null && lng != null) {
    region = regionFromCoords(lat, lng);
  }

  // Brand-only: if nothing in current region, search all
  if (stations.length === 0 && brandQuery) {
    stations = filterStations(all, {
      q: brandQuery,
      limit: resultLimit,
    });
  }

  // Sparse NI fallback (browse only — not place search)
  if (stations.length === 0 && !placeResolved && region === "ni") {
    stations = filterStations(all, {
      postcode: "BT",
      region: "ni",
      limit: resultLimit,
    });
    if (stations.length) areaLabel = "Northern Ireland";
  }

  // Sparse IE fallback
  if (stations.length === 0 && !placeResolved && region === "ie") {
    stations = filterStations(all, {
      region: "ie",
      lat,
      lng,
      radiusMiles: 200,
      limit: resultLimit,
    });
    if (stations.length) areaLabel = "Ireland";
  }

  // Sparse UK fallback
  if (stations.length === 0 && !placeResolved && region === "uk") {
    stations = filterStations(all, {
      region: "uk",
      limit: resultLimit,
    });
    if (stations.length) areaLabel = "United Kingdom";
  }

  const updatedTimes = sources
    .map((s) => s.updatedAt)
    .filter((t): t is string => Boolean(t));

  const preferredSource = sources.find((s) => {
    if (region === "ie" && s.id === "ie-fuelfinder" && s.updatedAt) return true;
    if (region !== "ie" && s.id !== "ie-fuelfinder" && s.updatedAt) return true;
    return false;
  });

  // Enrich amenities from OSM when tags exist
  try {
    const osmMap = await enrichAmenitiesFromOsm(stations);
    for (const station of stations) {
      const extra = osmMap.get(station.id);
      if (extra) {
        station.amenities = mergeAmenities(station.amenities, extra);
        station.contactless = station.amenities.contactless;
        station.ev = station.amenities.ev;
      }
    }
  } catch {
    // brand profiles still apply
  }

  // Live EV via Open Charge Map
  let ocmStatus: {
    enabled: boolean;
    used: boolean;
    matched: number;
    error?: string;
  } = {
    enabled: Boolean(getOcmApiKey()),
    used: false,
    matched: 0,
  };

  try {
    const { matches, usedOcm, error } = await enrichEvFromOpenChargeMap(
      stations.map((s) => ({
        id: s.id,
        name: s.name,
        brand: s.brand,
        latitude: s.latitude,
        longitude: s.longitude,
      })),
      { strictRadiusM: 100, brandRadiusM: 400 },
    );
    ocmStatus = {
      enabled: Boolean(getOcmApiKey()),
      used: usedOcm,
      matched: matches.size,
      error,
    };

    if (usedOcm) {
      for (const station of stations) {
        const hit = matches.get(station.id);
        if (hit) {
          station.ev = true;
          station.amenities = mergeAmenities(station.amenities, { ev: true });
          station.evDetails = hit;
        } else if (getOcmApiKey()) {
          station.ev = false;
          station.amenities = { ...station.amenities, ev: false };
          station.evDetails = null;
        }
      }
    }
  } catch {
    // brand / OSM EV flags remain
  }

  return NextResponse.json({
    stations,
    meta: {
      count: stations.length,
      totalIndexed: all.length,
      areaLabel,
      postcode: postcode || DEFAULTS[region].postcode || region,
      radiusMiles: searchRadius,
      region,
      suggestedCurrency: DEFAULTS[region].currency,
      searchMode: placeResolved
        ? "place"
        : brandQuery
          ? "brand"
          : postcode
            ? "postcode"
            : "default",
      sources,
      feedUpdatedAt: preferredSource?.updatedAt ?? updatedTimes[0] ?? null,
      fetchedAt: new Date().toISOString(),
      openChargeMap: ocmStatus,
      regions: {
        uk: stations.filter(
          (s) =>
            s.country === "GB" &&
            !s.postcode?.toUpperCase().replace(/\s+/g, "").startsWith("BT"),
        ).length,
        ni: stations.filter((s) =>
          s.postcode?.toUpperCase().replace(/\s+/g, "").startsWith("BT"),
        ).length,
        ie: stations.filter((s) => s.country === "IE").length,
        gb: stations.filter((s) => s.country === "GB").length,
      },
    },
  });
}
