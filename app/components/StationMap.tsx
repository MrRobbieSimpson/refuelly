"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type Map, type Marker } from "maplibre-gl";
import type { Station } from "../data/stations";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = {
  stations: Station[];
  selectedId?: string | null;
  onSelect?: (station: Station) => void;
  className?: string;
};

/** Free dark basemap (Carto Dark Matter) — matches Refuelly UI */
const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function stationKey(s: Station): string {
  return s.id || `${s.name}-${s.postcode}-${s.latitude}-${s.longitude}`;
}

function createBeamMarkerEl(selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `refuelly-beam-marker${selected ? " is-selected" : ""}`;
  el.innerHTML = `
    <span class="refuelly-beam-line"></span>
    <span class="refuelly-beam-core"></span>
    <span class="refuelly-beam-glow"></span>
  `;
  return el;
}

export function StationMap({
  stations,
  selectedId,
  onSelect,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerMapRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const mappable = useMemo(
    () =>
      stations.filter(
        (s) =>
          s.latitude != null &&
          s.longitude != null &&
          Number.isFinite(s.latitude) &&
          Number.isFinite(s.longitude),
      ),
    [stations],
  );

  const stationIds = useMemo(
    () => mappable.map(stationKey).join("|"),
    [mappable],
  );

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [-5.93, 54.6],
      zoom: 9,
      attributionControl: { compact: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    mapRef.current = map;

    return () => {
      markerMapRef.current.forEach((m) => m.remove());
      markerMapRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers when station set changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      markerMapRef.current.forEach((m) => m.remove());
      markerMapRef.current.clear();

      const bounds = new maplibregl.LngLatBounds();
      let hasPoint = false;

      for (const station of mappable) {
        const id = stationKey(station);
        const selected =
          selectedId != null &&
          (selectedId === station.id || selectedId === id);
        const el = createBeamMarkerEl(!!selected);
        el.title = station.name;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current?.(station);
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat([station.longitude!, station.latitude!])
          .addTo(map);

        markerMapRef.current.set(id, marker);
        bounds.extend([station.longitude!, station.latitude!]);
        hasPoint = true;
      }

      if (hasPoint) {
        map.fitBounds(bounds, {
          padding: { top: 100, bottom: 80, left: 60, right: 60 },
          maxZoom: 12,
          duration: 700,
        });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selected styling handled below
  }, [stationIds, mappable]);

  // Selection: restyle beams + fly to pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerMapRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      const isSel =
        selectedId != null &&
        (id === selectedId ||
          mappable.some(
            (s) =>
              (s.id === selectedId || stationKey(s) === selectedId) &&
              stationKey(s) === id,
          ));
      el.classList.toggle("is-selected", isSel);
    });

    if (!selectedId) return;
    const station = mappable.find(
      (s) => s.id === selectedId || stationKey(s) === selectedId,
    );
    if (!station?.latitude || !station?.longitude) return;

    map.flyTo({
      center: [station.longitude, station.latitude],
      zoom: Math.max(map.getZoom(), 12.5),
      duration: 900,
      essential: true,
    });
  }, [selectedId, mappable]);

  return (
    <div
      className={`relative h-full min-h-[520px] w-full overflow-hidden ${className}`}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 25% 45%, transparent 35%, rgba(4,3,11,0.5) 100%)",
        }}
      />
      {mappable.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="font-manrope rounded-lg bg-black/50 px-4 py-2 text-sm text-white/70">
            No mapped locations for these stations
          </p>
        </div>
      )}
    </div>
  );
}
