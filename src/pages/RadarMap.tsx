import { useEffect, useMemo, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { supabase } from "../lib/supabaseClient";
import { distanceMiles, priceLevelToDollars } from "../lib/distance";
import type { Restaurant } from "../lib/types";

export function RadarMap() {
  const { activeHub, couple } = useCouple();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

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
      .select("restaurant_id")
      .eq("couple_id", couple.id)
      .eq("wishlisted", true)
      .then(({ data }) => setWishlistIds(new Set((data ?? []).map((f: any) => f.restaurant_id))));
  }, [activeHub?.id, couple?.id]);

  const sorted = useMemo(() => {
    if (!activeHub) return [];
    return restaurants
      .map((r) => ({
        ...r,
        distance_mi: r.lat && r.lng ? distanceMiles(activeHub.lat, activeHub.lng, r.lat, r.lng) : undefined,
      }))
      .sort((a, b) => (a.distance_mi ?? 999) - (b.distance_mi ?? 999));
  }, [restaurants, activeHub]);

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
      </div>

      <div className="rounded-2xl overflow-hidden border border-orange-100 shadow-sm mb-6">
        <iframe
          title="Quest radar map"
          src={embedSrc}
          width="100%"
          height="420"
          style={{ border: 0 }}
          loading="lazy"
        />
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
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-sm text-stone-400 px-4 py-6 text-center">No spots yet — visit Discover to pull some in.</p>}
      </div>
    </div>
  );
}
