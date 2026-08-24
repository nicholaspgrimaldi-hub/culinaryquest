import { useEffect, useMemo, useRef, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { supabase } from "../lib/supabaseClient";
import { distanceMiles, priceLevelToDollars } from "../lib/distance";
import type { Restaurant } from "../lib/types";
import { loadGoogleMaps } from "../lib/loadGoogleMaps";

// Public, referrer-restricted key for the Google Maps JavaScript API (safe to
// ship to the browser — restrict it to this site's domain in Google Cloud
// Console). Separate from GOOGLE_PLACES_API_KEY, which is a server-only
// secret used by the google-proxy edge function and must never end up here.
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function escapeHtml(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

export function RadarMap() {
  const { activeHub, couple } = useCouple();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [mapsError, setMapsError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!activeHub || !couple) return;
    supabase
      .from("restaurants")
      .select("*")
      .eq("hub_id", activeHub.id)
      .then(({ data }) => setRestaurants((data as Restaurant[]) ?? []));
    supabase
      .from("visits")
      .select("restaurant_id")
      .eq("couple_id", couple.id)
      .then(({ data }) => setVisitedIds(new Set((data ?? []).map((v: any) => v.restaurant_id))));
    supabase
      .from("restaurant_flags")
      .select("restaurant_id, wishlisted, dismissed")
      .eq("couple_id", couple.id)
      .then(({ data }) => {
        setWishlistIds(new Set((data ?? []).filter((f: any) => f.wishlisted).map((f: any) => f.restaurant_id)));
        setDismissedIds(new Set((data ?? []).filter((f: any) => f.dismissed).map((f: any) => f.restaurant_id)));
      });
  }, [activeHub?.id, couple?.id]);

  async function toggleDismiss(r: Restaurant) {
    if (!couple) return;
    await supabase
      .from("restaurant_flags")
      .upsert({ couple_id: couple.id, restaurant_id: r.id, dismissed: true });
    setDismissedIds((prev) => new Set(prev).add(r.id));
  }

  const sorted = useMemo(() => {
    if (!activeHub) return [];
    return restaurants
      // Spots removed from consideration on Discover shouldn't clutter the
      // map or its list either.
      .filter((r) => !dismissedIds.has(r.id))
      .map((r) => ({
        ...r,
        distance_mi: r.lat && r.lng ? distanceMiles(activeHub.lat, activeHub.lng, r.lat, r.lng) : undefined,
      }))
      .sort((a, b) => (a.distance_mi ?? 999) - (b.distance_mi ?? 999));
  }, [restaurants, activeHub, dismissedIds]);

  // Create the map (once, reused via ref) and (re)draw markers whenever the
  // hub or restaurant data changes. Combined into one effect so marker
  // drawing never races against map creation.
  useEffect(() => {
    if (!MAPS_API_KEY || !activeHub || !mapContainerRef.current) return;
    let cancelled = false;

    loadGoogleMaps(MAPS_API_KEY)
      .then((google) => {
        if (cancelled || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
            center: { lat: activeHub.lat, lng: activeHub.lng },
            zoom: 12,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          });
        }
        const map = mapInstanceRef.current;

        // Clear any markers from a previous render before redrawing.
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        const infoWindow = new google.maps.InfoWindow();
        let infoWindowRestaurant: Restaurant | null = null;
        google.maps.event.addListener(infoWindow, "domready", () => {
          const btn = document.getElementById("iw-dismiss-btn");
          if (btn && infoWindowRestaurant) {
            const r = infoWindowRestaurant;
            btn.onclick = () => {
              toggleDismiss(r);
              infoWindow.close();
            };
          }
        });

        const homeMarker = new google.maps.Marker({
          position: { lat: activeHub.lat, lng: activeHub.lng },
          map,
          title: activeHub.label,
          zIndex: 999,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        markersRef.current.push(homeMarker);
        bounds.extend(homeMarker.getPosition());

        sorted.forEach((r) => {
          if (r.lat == null || r.lng == null) return;
          const color = visitedIds.has(r.id) ? "#6366f1" : wishlistIds.has(r.id) ? "#f59e0b" : "#14b8a6";
          const position = { lat: r.lat, lng: r.lng };
          const marker = new google.maps.Marker({
            position,
            map,
            title: r.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 1.5,
            },
          });
          marker.addListener("click", () => {
            infoWindowRestaurant = r;
            infoWindow.setContent(
              `<div style="font-family: sans-serif; min-width: 160px;">` +
                `<p style="font-weight: 700; margin: 0 0 2px;">${escapeHtml(r.name)}</p>` +
                `<p style="font-size: 12px; color: #78716c; margin: 0 0 6px;">${escapeHtml(r.city ?? "")}` +
                `${r.rating ? ` · ⭐ ${r.rating}` : ""}` +
                `${r.distance_mi != null ? ` · ${r.distance_mi.toFixed(1)} mi` : ""}</p>` +
                `<button id="iw-dismiss-btn" style="font-size: 11px; font-weight: 600; color: #78716c; background: #f5f5f4; border: none; border-radius: 6px; padding: 4px 8px; cursor: pointer;">🚫 Remove from Consideration</button>` +
                `</div>`
            );
            infoWindow.open({ map, anchor: marker });
          });
          markersRef.current.push(marker);
          bounds.extend(position);
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 48);
        }
      })
      .catch((err: any) => {
        if (!cancelled) setMapsError(err.message ?? String(err));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHub?.id, sorted, visitedIds, wishlistIds]);

  if (!activeHub) return null;

  const embedSrc = `https://www.google.com/maps?q=${activeHub.lat},${activeHub.lng}&z=12&output=embed`;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🧭</span>
          <div>
            <h2 className="text-lg font-extrabold text-stone-800">
              Interactive {activeHub.radius_miles}-Mile Culinary Radar Map
            </h2>
            <p className="text-sm text-stone-500">Pinned to {activeHub.label} ({activeHub.address})</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> Home Base</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-teal-500 inline-block" /> Unvisited Gem</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block" /> Visited & Rated</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" /> Wishlist</span>
        </div>
        {MAPS_API_KEY && mapsError && (
          <p className="text-xs text-red-500 mt-2">Map failed to load: {mapsError}</p>
        )}
        {!MAPS_API_KEY && (
          <p className="text-xs text-amber-600 mt-2">
            Showing a basic map without restaurant pins — set the VITE_GOOGLE_MAPS_API_KEY environment variable to
            enable the full interactive map with pins for every spot.
          </p>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden border border-orange-100 shadow-sm mb-6">
        {MAPS_API_KEY ? (
          <div ref={mapContainerRef} style={{ width: "100%", height: 420 }} />
        ) : (
          <iframe
            title="Quest radar map"
            src={embedSrc}
            width="100%"
            height="420"
            style={{ border: 0 }}
            loading="lazy"
          />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm divide-y">
        {sorted.map((r) => {
          const dot = visitedIds.has(r.id) ? "bg-indigo-500" : wishlistIds.has(r.id) ? "bg-amber-500" : "bg-teal-500";
          return (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`h-2.5 w-2.5 rounded-full ${dot} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800 truncate">{r.name}</p>
                <p className="text-xs text-stone-500 truncate">
                  {r.city} · {priceLevelToDollars(r.price_level)} {r.rating ? `· ⭐ ${r.rating}` : ""}
                </p>
              </div>
              {r.distance_mi != null && (
                <span className="text-xs font-bold text-stone-500 shrink-0">{r.distance_mi.toFixed(1)} mi</span>
              )}
              <button
                onClick={() => toggleDismiss(r)}
                className="text-stone-400 hover:text-red-500 text-xs shrink-0"
                aria-label="Remove from consideration"
                title="Remove from consideration"
              >
                🚫
              </button>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-sm text-stone-400 px-4 py-6 text-center">No spots yet — visit Discover to pull some in.</p>}
      </div>
    </div>
  );
}
