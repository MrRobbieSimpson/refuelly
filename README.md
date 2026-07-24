# Refuelly

Find live fuel prices across the **United Kingdom**, **Northern Ireland**, and **Ireland** — list and map views, amenities, and EV charger lookup.

Built with **Next.js 16**, **React 19**, **Tailwind CSS 4**, and **MapLibre GL**.

## Features

- Live prices from public UK retailer open-data feeds (Asda, Tesco, MFG, Applegreen)
- Ireland prices via [FuelFinder.ie](https://www.fuelfinder.ie) (community data)
- Search by **postcode**, **town/city**, or **brand** (~20 mile radius for places)
- Region tabs: **UK · NI · Ireland**
- Currency toggle: **£ pence / € cents**
- Amenities (brand defaults + optional OSM)
- EV charging via [Open Charge Map](https://openchargemap.org) (optional API key)
- **Map View** with dark basemap and beam-style markers
- **Directions** opens Map View and highlights that station

## Requirements

- Node.js 20+ recommended
- npm

## Setup

```bash
git clone https://github.com/MrRobbieSimpson/refuelly.git
cd refuelly
npm install
cp .env.example .env.local
```

### Environment variables

Create `.env.local` (never commit this file):

```bash
# Optional but recommended — free key from https://openchargemap.org/site/develop/apikey
OPENCHARGEMAP_API_KEY=your_key_here
```

Without an Open Charge Map key, the app still runs; EV badges fall back to brand/OSM heuristics.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm start       # serve production build
npm run lint    # eslint
```

## Project layout

```
app/
  api/stations/     # Aggregates UK + IE feeds, search, OCM EV enrichment
  components/       # UI, map, station cards
  data/             # Types + fallback stations
  lib/              # Fuel feeds, amenities, Open Charge Map
public/figma/       # Logo / static SVG assets
```

## Data sources

| Region | Source | Notes |
|--------|--------|--------|
| UK / NI | Retailer JSON open data | E10 = unleaded, B7 = diesel (pence/L) |
| Ireland | FuelFinder.ie public API | Community prices (€/L) |
| EV | Open Charge Map API | Requires free API key |

Coverage depends on what retailers and community sources publish. Not every forecourt is included.

## Design

UI inspired by the Refuelly Figma file (list + map desktop frames).

## License

Private project unless otherwise noted.
