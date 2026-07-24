import type { Amenities, Station } from "../data/stations";
import {
  AtmIcon,
  CardGlow,
  CarWashIcon,
  Clock24Icon,
  ContactlessIcon,
  EvBoltIcon,
  MapPinGlyph,
  ShopIcon,
  ToiletsIcon,
} from "./icons";

export type Currency = "gbp" | "eur";

const AMENITY_ITEMS: {
  key: keyof Amenities;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "contactless", label: "Contactless", icon: <ContactlessIcon /> },
  { key: "ev", label: "EV Charging", icon: <EvBoltIcon /> },
  { key: "shop", label: "Shop", icon: <ShopIcon /> },
  { key: "carWash", label: "Car Wash", icon: <CarWashIcon /> },
  { key: "toilets", label: "Toilets", icon: <ToiletsIcon /> },
  { key: "atm", label: "ATM", icon: <AtmIcon /> },
  { key: "open24h", label: "24h", icon: <Clock24Icon /> },
];

function evLabel(station: Station): string {
  const d = station.evDetails;
  if (!d) return "EV Charging";
  const parts = ["EV"];
  if (d.nearby > 1) parts.push(`×${d.nearby}`);
  if (d.maxKw != null) parts.push(`${Math.round(d.maxKw)}kW`);
  return parts.join(" · ");
}

function resolveAmenities(station: Station): Amenities {
  if (station.amenities) return station.amenities;
  return {
    contactless: station.contactless !== false,
    ev: !!station.ev,
    shop: false,
    carWash: false,
    toilets: false,
    atm: false,
    open24h: false,
  };
}

const EUR_PER_GBP = 1.17;

function formatPrice(
  value: string,
  sourceCurrency: "GBP" | "EUR",
  display: Currency,
): { text: string; unit: string } {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return { text: value, unit: "" };

  // Values are stored as minor units: pence (GBP) or euro-cents (EUR)
  if (sourceCurrency === "GBP") {
    if (display === "gbp") return { text: n.toFixed(1), unit: "p" };
    return { text: (n * EUR_PER_GBP).toFixed(1), unit: "c" };
  }
  // EUR source
  if (display === "eur") return { text: n.toFixed(1), unit: "c" };
  return { text: (n / EUR_PER_GBP).toFixed(1), unit: "p" };
}

function PriceRow({
  unleaded,
  diesel,
  currency,
  priceCurrency = "GBP",
}: {
  unleaded: string;
  diesel: string;
  currency: Currency;
  priceCurrency?: "GBP" | "EUR";
}) {
  const u = formatPrice(unleaded, priceCurrency, currency);
  const d = formatPrice(diesel, priceCurrency, currency);

  return (
    <div className="mt-auto flex h-[85px] items-stretch border-t border-[rgba(80,80,80,0.25)]">
      <div className="flex min-w-0 flex-1 items-center px-6">
        <p className="font-manrope text-[15px] font-bold text-white">Latest Prices</p>
      </div>

      <div
        className="flex w-[117px] shrink-0 flex-col justify-center px-3"
        style={{
          background: "#34D399",
          boxShadow: "0 0 18px rgba(52,211,153,0.4)",
        }}
      >
        <p className="font-manrope mb-1 text-[10px] font-normal uppercase tracking-wider text-white">
          Unleaded
        </p>
        <p className="font-manrope text-[22px] font-extrabold leading-none text-white">
          {u.text}
          {u.unit && (
            <span className="ml-0.5 text-[12px] font-medium text-white/70">{u.unit}</span>
          )}
        </p>
      </div>

      <div className="flex w-[113px] shrink-0 flex-col justify-center rounded-br-[8px] bg-white px-3">
        <p className="font-manrope mb-1 text-[10px] font-normal uppercase tracking-wider text-[#282828]">
          Diesel
        </p>
        <p className="font-manrope text-[22px] font-extrabold leading-none text-[#282828]">
          {d.text}
          {d.unit && (
            <span className="ml-0.5 text-[12px] font-medium opacity-60">{d.unit}</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function StationCard({
  station,
  currency,
  selected = false,
  onSelect,
  onDirections,
}: {
  station: Station;
  currency: Currency;
  selected?: boolean;
  onSelect?: (station: Station) => void;
  /** Opens map view + highlights this station (Figma Map View flow) */
  onDirections?: (station: Station) => void;
}) {
  const amenities = resolveAmenities(station);
  const activeAmenities = AMENITY_ITEMS.filter((a) => amenities[a.key]);

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(station)}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(station);
        }
      }}
      className={[
        "group relative min-h-[249px] cursor-pointer overflow-hidden rounded-[8px]",
        "border border-solid transition-all duration-300 ease-out",
        selected || station.featured
          ? "border-[rgba(92,99,233,0.75)] shadow-[0_0_32px_rgba(92,99,233,0.18)]"
          : "border-[rgba(92,99,233,0.25)] hover:border-[rgba(92,99,233,0.65)]",
        "hover:-translate-y-1.5 hover:shadow-[0_8px_48px_rgba(92,99,233,0.2)]",
      ].join(" ")}
      style={{
        backgroundImage:
          "linear-gradient(119.344deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
      }}
    >
      {station.featured && <CardGlow />}

      <div className="flex h-full min-h-[249px] flex-col">
        <div className="flex flex-1 flex-col px-6 pb-3 pt-6">
          <h3 className="font-manrope mb-1 text-[22px] font-extrabold leading-tight text-white transition-colors group-hover:text-white/90">
            {station.name}
          </h3>

          <p className="font-manrope mb-4 text-[14px] font-medium leading-snug text-[rgba(158,158,158,0.65)]">
            {station.address}
            {station.postcode ? ` · ${station.postcode}` : ""}
          </p>

          <div className="mt-auto flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
              {activeAmenities.length > 0 ? (
                activeAmenities.map((a) => {
                  const label =
                    a.key === "ev" ? evLabel(station) : a.label;
                  const title =
                    a.key === "ev" && station.evDetails
                      ? [
                          station.evDetails.title,
                          station.evDetails.operator,
                          station.evDetails.distanceM != null
                            ? `${station.evDetails.distanceM}m away`
                            : null,
                          station.evDetails.maxKw != null
                            ? `up to ${Math.round(station.evDetails.maxKw)} kW`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : a.label;
                  return (
                    <div
                      key={a.key}
                      className="inline-flex items-center gap-1.5"
                      title={title}
                    >
                      {a.icon}
                      <span className="font-manrope text-[13px] font-medium text-white/65">
                        {label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <span className="font-manrope text-[13px] font-medium text-white/40">
                  Amenities unknown
                </span>
              )}
            </div>
            <button
              type="button"
              className="font-inter inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-[14px] font-medium text-[rgba(158,158,158,0.65)] underline underline-offset-2 transition-colors hover:text-white/80"
              onClick={(e) => {
                e.stopPropagation();
                onDirections?.(station);
              }}
            >
              <span className="inline-flex shrink-0 opacity-70">
                <MapPinGlyph />
              </span>
              Directions
            </button>
          </div>
        </div>

        <PriceRow
          unleaded={station.unleaded}
          diesel={station.diesel}
          currency={currency}
          priceCurrency={station.priceCurrency || "GBP"}
        />
      </div>
    </div>
  );
}
