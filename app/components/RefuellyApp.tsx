"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fallbackStations, type Station } from "../data/stations";
import { Logo, MapViewIcon, PlusIcon, ScrollCornerIcon } from "./icons";
import { StationCard, type Currency } from "./StationCard";

const StationMap = dynamic(
  () => import("./StationMap").then((m) => m.StationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[520px] items-center justify-center bg-[#04030b]">
        <p className="font-manrope text-sm text-white/50">Loading map…</p>
      </div>
    ),
  },
);

type Region = "uk" | "ni" | "ie";
type ViewMode = "list" | "map";

type ApiResponse = {
  stations: Station[];
  meta: {
    count: number;
    totalIndexed: number;
    areaLabel: string;
    postcode: string;
    feedUpdatedAt: string | null;
    fetchedAt: string;
    region?: Region;
    suggestedCurrency?: Currency;
    sources: { id: string; count: number; updatedAt: string | null; error?: string }[];
    regions?: { uk?: number; ni?: number; ie?: number; gb?: number };
  };
};

const REGION_TABS: { id: Region; label: string }[] = [
  { id: "uk", label: "UK" },
  { id: "ni", label: "NI" },
  { id: "ie", label: "Ireland" },
];

const IE_PLACE_RE =
  /\b(dublin|cork|galway|limerick|waterford|kerry|mayo|donegal|clare|tipperary|wexford|kilkenny|wicklow|kildare|meath|louth|cavan|monaghan|sligo|roscommon|leitrim|longford|westmeath|offaly|laois|carlow|ireland|eire|eircode)\b/i;

const NI_PLACE_RE =
  /\b(belfast|lisburn|newry|derry|londonderry|bangor|newtownards|antrim|armagh|omagh|enniskillen|coleraine|ballymena|craigavon|portadown|larne|carrickfergus|holywood|downpatrick|strabane|limavady|ballyclare|cookstown|dungannon)\b/i;

function looksLikeIrelandSearch(q: string): boolean {
  const t = q.trim();
  if (!t) return false;
  if (IE_PLACE_RE.test(t)) return true;
  if (/^[A-Z]\d{2}/i.test(t.replace(/\s+/g, ""))) return true;
  return false;
}

function looksLikeNiSearch(q: string): boolean {
  return NI_PLACE_RE.test(q.trim());
}

function stationKey(s: Station): string {
  return s.id || `${s.name}-${s.postcode}-${s.latitude}-${s.longitude}`;
}

function formatRelativeUpdate(isoOrFeed: string | null, fetchedAt?: string): string {
  const raw = isoOrFeed || fetchedAt;
  if (!raw) return "Live prices loading…";

  let date: Date | null = null;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
    const [d, t] = raw.split(" ");
    const [dd, mm, yyyy] = d.split("/").map(Number);
    const [hh = 0, mi = 0, ss = 0] = (t || "").split(":").map(Number);
    date = new Date(yyyy, mm - 1, dd, hh, mi, ss);
  } else {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  if (!date || Number.isNaN(date.getTime())) {
    return isoOrFeed ? `Updated ${isoOrFeed}` : "Live prices";
  }

  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return "Last updated just now";
  if (mins < 60) return `Last updated ${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `Last updated ${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  return `Last updated ${date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function TabGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-[8px] bg-[rgba(20,28,37,0.45)] p-1"
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={[
              "font-inter cursor-pointer rounded-[6px] px-4 py-1 text-[14px] font-medium transition-all duration-200",
              active
                ? "bg-[#344051] text-white shadow-sm"
                : "text-[#637083] hover:text-white/70",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function RefuellyApp() {
  const [currency, setCurrency] = useState<Currency>("gbp");
  const [region, setRegion] = useState<Region>("ni");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [stations, setStations] = useState<Station[]>(fallbackStations);
  const [areaLabel, setAreaLabel] = useState("Outer Belfast");
  const [updatedLabel, setUpdatedLabel] = useState("Loading live prices…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalIndexed, setTotalIndexed] = useState(0);
  const cardListRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (search: string, activeRegion: Region) => {
    setLoading(true);
    setError(null);

    let regionToUse = activeRegion;
    if (looksLikeIrelandSearch(search)) {
      regionToUse = "ie";
      setRegion("ie");
      setCurrency("eur");
    } else if (looksLikeNiSearch(search)) {
      regionToUse = "ni";
      setRegion("ni");
      setCurrency("gbp");
    }

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("region", regionToUse);
      // Place searches use API PLACE_LIMIT; brand/browse can take more than 12
      params.set("limit", "48");
      const res = await fetch(`/api/stations?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as ApiResponse;

      if (data.meta.region && data.meta.region !== regionToUse) {
        setRegion(data.meta.region);
        regionToUse = data.meta.region;
      }

      if (data.meta.suggestedCurrency) {
        setCurrency(data.meta.suggestedCurrency);
      } else if (regionToUse === "ie") {
        setCurrency("eur");
      } else {
        setCurrency("gbp");
      }

      if (!data.stations?.length) {
        setStations([]);
        setAreaLabel(data.meta?.areaLabel || "Your search");
        setUpdatedLabel("No stations found for this search");
        setTotalIndexed(data.meta?.totalIndexed ?? 0);
        setSelectedId(null);
      } else {
        setStations(data.stations);
        setAreaLabel(data.meta.areaLabel || "Nearby");
        setUpdatedLabel(
          formatRelativeUpdate(data.meta.feedUpdatedAt, data.meta.fetchedAt),
        );
        setTotalIndexed(data.meta.totalIndexed);

        const ieCount =
          data.meta.regions?.ie ??
          data.stations.filter((s) => s.country === "IE").length;
        if (ieCount > 0 && ieCount >= data.stations.length / 2) {
          setCurrency("eur");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prices");
      setStations(fallbackStations);
      setUpdatedLabel("Showing cached fallback prices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(query, region);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (submitted === query) return;
      setSubmitted(query);
      void load(query, region);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filtered = useMemo(() => stations, [stations]);

  const handleRegionChange = (next: Region) => {
    setRegion(next);
    if (next === "ie") setCurrency("eur");
    else setCurrency("gbp");
  };

  const openMapView = (station?: Station) => {
    setViewMode("map");
    if (station) {
      const id = stationKey(station);
      setSelectedId(id);
      // Scroll card into view after layout
      requestAnimationFrame(() => {
        const el = cardListRef.current?.querySelector(
          `[data-station-id="${CSS.escape(id)}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };

  const handleSelectStation = (station: Station) => {
    const id = stationKey(station);
    setSelectedId(id);
    if (viewMode === "map") {
      requestAnimationFrame(() => {
        const el = cardListRef.current?.querySelector(
          `[data-station-id="${CSS.escape(id)}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-auto bg-[#04030b]">
      <div className="relative min-w-[1100px]">
        {viewMode === "list" && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute left-1/2 top-1/2 h-[700px] w-[1400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse, #484085 0%, transparent 70%)",
                filter: "blur(120px)",
              }}
            />
          </div>
        )}

        <header className="relative z-20 flex h-[106px] items-center gap-8 px-[100px] backdrop-blur-[40px]">
          <a href="/" className="shrink-0" aria-label="refuelly home">
            <Logo />
          </a>

          <div className="mx-auto max-w-[400px] flex-1">
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(query);
                void load(query, region);
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  if (looksLikeIrelandSearch(v)) {
                    setCurrency("eur");
                    setRegion("ie");
                  } else if (looksLikeNiSearch(v)) {
                    setCurrency("gbp");
                    setRegion("ni");
                  }
                }}
                placeholder="Search a postcode, town or brand name"
                className="font-inter peer relative z-10 w-full rounded-[55px] border border-[#41397b] bg-white/[0.04] px-6 py-3 text-[14px] font-medium text-[#e9e9e9] outline-none transition-all duration-200 placeholder:text-[#9e9e9e] focus:border-[#6466fd] focus:ring-1 focus:ring-inset focus:ring-[#6466fd]"
                aria-label="Search by postcode, place, or brand"
              />
            </form>
          </div>

          <nav className="ml-auto flex items-center gap-6">
            <a
              href="#"
              className="font-inter text-[14px] font-medium text-[#9e9e9e] transition-colors hover:text-white"
            >
              Instagram
            </a>
            <a
              href="#"
              className="font-inter text-[14px] font-medium text-[#9e9e9e] transition-colors hover:text-white"
            >
              About
            </a>
            <button
              type="button"
              onClick={() =>
                viewMode === "map" ? setViewMode("list") : openMapView()
              }
              className={[
                "flex cursor-pointer items-center gap-2 rounded-[10px] px-5 py-2.5 transition-colors duration-200",
                viewMode === "map"
                  ? "bg-[#6466fd] text-white hover:bg-[#7577ff]"
                  : "bg-[#141c25] text-white hover:bg-[#1e2a38]",
              ].join(" ")}
            >
              <MapViewIcon />
              <span className="font-inter text-[14px] font-medium">
                {viewMode === "map" ? "List View" : "Map View"}
              </span>
            </button>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-2 rounded-[10px] bg-[#f2f4f7] px-5 py-2.5 transition-colors duration-200 hover:bg-white"
            >
              <PlusIcon />
              <span className="font-inter text-[14px] font-medium text-[#141c25]">
                Add Entry
              </span>
            </button>
          </nav>
        </header>

        <div
          className="relative z-20 h-px w-full"
          style={{ background: "linear-gradient(to right, #6466fd, #254b68)" }}
        />

        <div
          className={[
            "relative z-10 flex flex-wrap items-start justify-between gap-4 pt-6",
            viewMode === "map" ? "px-[100px] pb-3" : "px-[100px] pb-4",
          ].join(" ")}
        >
          <div>
            <p className="font-manrope text-[18px] font-medium">
              <span className="text-[#637083]">Fuel Stations near you · </span>
              <span className="text-white">{areaLabel}</span>
            </p>
            <p className="font-inter mt-1 text-[12px] font-medium text-[#637083]">
              {loading ? "Refreshing live prices…" : updatedLabel}
              {!loading && totalIndexed > 0 && (
                <span className="text-[#637083]/70">
                  {" "}
                  · {totalIndexed.toLocaleString()} stations indexed
                </span>
              )}
              {error && <span className="text-amber-400/90"> · {error}</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TabGroup
              ariaLabel="Region"
              options={REGION_TABS}
              value={region}
              onChange={handleRegionChange}
            />
            <TabGroup
              ariaLabel="Currency"
              options={[
                { id: "gbp" as Currency, label: "£ Pounds" },
                { id: "eur" as Currency, label: "€ Euro" },
              ]}
              value={currency}
              onChange={setCurrency}
            />
          </div>
        </div>

        {/* ── LIST VIEW ── */}
        {viewMode === "list" && (
          <>
            <main className="relative z-10 px-[100px] pb-20">
              {loading && filtered.length === 0 ? (
                <div className="grid grid-cols-3 gap-[19px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[249px] animate-pulse rounded-[8px] border border-[rgba(92,99,233,0.15)] bg-white/[0.03]"
                    />
                  ))}
                </div>
              ) : filtered.length > 0 ? (
                <div
                  className={[
                    "grid grid-cols-3 gap-[19px] transition-opacity",
                    loading ? "opacity-60" : "opacity-100",
                  ].join(" ")}
                >
                  {filtered.map((station) => (
                    <StationCard
                      key={stationKey(station)}
                      station={station}
                      currency={currency}
                      onDirections={openMapView}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24">
                  <p className="font-manrope text-[18px] font-medium text-[#637083]">
                    No stations match your search.
                  </p>
                  <p className="font-inter mt-2 text-[13px] text-[#637083]/80">
                    Try another place, or switch UK / NI / Ireland tabs.
                  </p>
                </div>
              )}
            </main>

            <div className="flex flex-col items-center gap-2 pb-8 opacity-60">
              <p className="font-manrope text-[14px] font-medium text-[#9f9f9f]">
                Scroll Down
              </p>
              <div className="rotate-45">
                <ScrollCornerIcon />
              </div>
              <p className="font-inter mt-4 max-w-xl px-6 text-center text-[11px] leading-relaxed text-[#637083]">
                UK &amp; NI: retailer open-data feeds · Ireland: FuelFinder.ie ·
                EV via Open Charge Map. Map View plots live pins with beam
                markers.
              </p>
            </div>
          </>
        )}

        {/* ── MAP VIEW (Figma: list column + map with beam pins) ── */}
        {viewMode === "map" && (
          <div className="relative z-10 flex h-[calc(100vh-180px)] min-h-[620px] w-full">
            {/* Left: station cards */}
            <div
              ref={cardListRef}
              className="relative z-10 flex w-[600px] shrink-0 flex-col gap-5 overflow-y-auto pb-10 pl-[100px] pr-6 pt-2"
            >
              {loading && filtered.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[249px] animate-pulse rounded-[8px] border border-[rgba(92,99,233,0.15)] bg-white/[0.03]"
                  />
                ))
              ) : filtered.length > 0 ? (
                filtered.map((station) => {
                  const id = stationKey(station);
                  return (
                    <div key={id} data-station-id={id}>
                      <StationCard
                        station={station}
                        currency={currency}
                        selected={selectedId === id}
                        onSelect={handleSelectStation}
                        onDirections={openMapView}
                      />
                    </div>
                  );
                })
              ) : (
                <p className="font-manrope text-[16px] text-[#637083]">
                  No stations to show on the map.
                </p>
              )}
            </div>

            {/* Right: map fills remaining space */}
            <div className="relative min-w-0 flex-1">
              <StationMap
                stations={filtered}
                selectedId={selectedId}
                onSelect={handleSelectStation}
                className="absolute inset-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
