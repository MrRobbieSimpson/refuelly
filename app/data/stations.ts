/** Shared station shape used by UI + live API */

export type Amenities = {
  contactless: boolean;
  ev: boolean;
  shop: boolean;
  carWash: boolean;
  toilets: boolean;
  atm: boolean;
  open24h: boolean;
};

export type EvDetails = {
  nearby: number;
  maxKw: number | null;
  distanceM: number | null;
  title?: string | null;
  operator?: string | null;
};

export type Station = {
  id?: string;
  name: string;
  address: string;
  unleaded: string;
  diesel: string;
  /** GBP = pence/L, EUR = euro-cents/L */
  priceCurrency?: "GBP" | "EUR";
  country?: "GB" | "IE";
  contactless?: boolean;
  ev?: boolean;
  /** Live Open Charge Map match when API key is configured */
  evDetails?: EvDetails | null;
  amenities?: Amenities;
  featured?: boolean;
  postcode?: string;
  brand?: string;
  latitude?: number | null;
  longitude?: number | null;
  source?: string;
};

/** Static fallback if live feeds are unreachable */
export const fallbackStations: Station[] = [
  {
    id: "fallback-1",
    name: "Asda",
    address: "Ards Shopping Centre · Newtownards",
    postcode: "BT23 4EU",
    unleaded: "145.7",
    diesel: "157.7",
    priceCurrency: "GBP",
    country: "GB",
    contactless: true,
    ev: true,
    amenities: {
      contactless: true,
      ev: true,
      shop: true,
      carWash: true,
      toilets: true,
      atm: true,
      open24h: false,
    },
    featured: true,
  },
  {
    id: "fallback-2",
    name: "Tesco",
    address: "Knocknagoney Road · Belfast",
    postcode: "BT4 2PW",
    unleaded: "149.9",
    diesel: "178.9",
    priceCurrency: "GBP",
    country: "GB",
    contactless: true,
    ev: true,
    amenities: {
      contactless: true,
      ev: true,
      shop: true,
      carWash: true,
      toilets: true,
      atm: true,
      open24h: false,
    },
  },
];
