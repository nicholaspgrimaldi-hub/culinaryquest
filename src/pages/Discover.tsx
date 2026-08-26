import { useEffect, useMemo, useRef, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { callEdgeFunction, supabase } from "../lib/supabaseClient";
import { distanceMiles } from "../lib/distance";
import type { Restaurant } from "../lib/types";
import { RestaurantCard } from "../components/RestaurantCard";
import { AddPlaceModal } from "../components/AddPlaceModal";
import { LogVisitModal } from "../components/LogVisitModal";

type VisitedFilter = "all" | "unvisited" | "wishlist" | "visited" | "ignored";
type SortKey = "rating" | "closest" | "reviews" | "alpha";

const MEAL_TYPE_LABEL: Record<string, string> = {
  coffee_breakfast: "☕ Coffee & Breakfast",
  lunch: "🥪 Lunch",
  dinner: "🌙 Dinner",
};

// Google Places doesn't have a precise breakfast/lunch/dinner filter, so a
// hub's meal focus is folded into the text search query itself.
const MEAL_TYPE_SEARCH_KEYWORD: Record<string, string> = {
  coffee_breakfast: "breakfast and coffee",
  lunch: "lunch",
  dinner: "dinner",
};

export function Discover() {
  const { activeHub, couple } = useCouple();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [radiusFilter, setRadiusFilter] = useState<number>(activeHub?.radius_miles ?? 5);
  const [sort, setSort] = useState<SortKey>("rating");
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilter>("unvisited");
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [logVisitFor, setLogVisitFor] = useState<Restaurant | null>(null);
  const autoDiscoverAttempted = useRef<Set<string>>(new Set());

  async function loadData(): Promise<Restaurant[]> {
    if (!activeHub || !couple) return [];
    const { data: rest } = await supabase.from("restaurants").select("*").eq("hub_id", activeHub.id);
    const restaurantRows = (rest as Restaurant[]) ?? [];
    setRestaurants(restaurantRows);

    const { data: visits } = await supabase.from("visits").select("restaurant_id").eq("couple_id", couple.id);
    setVisitedIds(new Set((visits ?? []).map((v: any) => v.restaurant_id)));

    const { data: flags } = await supabase
      .from("restaurant_flags")
      .select("restaurant_id, wishlisted, dismissed")
      .eq("couple_id", couple.id);
    setWishlistIds(new Set((flags ?? []).filter((f: any) => f.wishlisted).map((f: any) => f.restaurant_id)));
    setDismissedIds(new Set((flags ?? []).filter((f: any) => f.dismissed).map((f: any) => f.restaurant_id)));

    return restaurantRows;
  }

  useEffect(() => {
    let cancelled = false;
    if (activeHub) setRadiusFilter(activeHub.radius_miles);
    (async () => {
      const rows = await loadData();
      if (cancelled || !activeHub) return;
      // Auto-discover: the first time we see a hub with zero restaurants (e.g.
      // right after it's created), pull real nearby places in automatically
      // instead of requiring a manual "Discover More Local Spots" click.
      if (rows.length === 0 && !autoDiscoverAttempted.current.has(activeHub.id)) {
        autoDiscoverAttempted.current.add(activeHub.id);
        discoverMore();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHub?.id, couple?.id]);

  const withDistance = useMemo(() => {
    if (!activeHub) return [];
    return restaurants.map((r) => ({
      ...r,
      distance_mi: r.lat && r.lng ? distanceMiles(activeHub.lat, activeHub.lng, r.lat, r.lng) : undefined,
    }));
  }, [restaurants, activeHub]);

  const filtered = useMemo(() => {
    let list = withDistance.filter((r) => r.distance_mi == null || r.distance_mi <= radiusFilter);

    if (visitedFilter === "ignored") {
      // The one tab where dismissed spots are the point, not the exception —
      // this is how someone finds a place again to un-ignore it.
      list = list.filter((r) => dismissedIds.has(r.id));
    } else {
      list = list.filter((r) => !dismissedIds.has(r.id));
      if (visitedFilter === "unvisited") list = list.filter((r) => !visitedIds.has(r.id));
      if (visitedFilter === "visited") list = list.filter((r) => visitedIds.has(r.id));
      if (visitedFilter === "wishlist") list = list.filter((r) => wishlistIds.has(r.id));
    }

    const sorted = [...list].sort((a, b) => {
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === "closest") return (a.distance_mi ?? 999) - (b.distance_mi ?? 999);
      if (sort === "reviews") return (b.review_count ?? 0) - (a.review_count ?? 0);
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [withDistance, radiusFilter, visitedFilter, wishlistIds, visitedIds, dismissedIds, sort]);

  // Ignored spots don't count toward the quest — they're out of scope, not
  // "still to explore."
  const activeRestaurantCount = restaurants.filter((r) => !dismissedIds.has(r.id)).length;
  const conquered = [...visitedIds].filter((id) => !dismissedIds.has(id)).length;
  const total = activeRestaurantCount;

  async function toggleWishlist(r: Restaurant) {
    if (!couple) return;
    const nowWishlisted = !wishlistIds.has(r.id);
    await supabase
      .from("restaurant_flags")
      .upsert({ couple_id: couple.id, restaurant_id: r.id, wishlisted: nowWishlisted });
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (nowWishlisted) next.add(r.id);
      else next.delete(r.id);
      return next;
    });
  }

  async function toggleDismiss(r: Restaurant) {
    if (!couple) return;
    const nowDismissed = !dismissedIds.has(r.id);
    await supabase
      .from("restaurant_flags")
      .upsert({ couple_id: couple.id, restaurant_id: r.id, dismissed: nowDismissed });
    setDismissedIds((prev) => {
      const next = new Set(prev);
      if (nowDismissed) next.add(r.id);
      else next.delete(r.id);
      return next;
    });
  }

  async function discoverMore() {
    if (!activeHub) return;
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const { places } = await callEdgeFunction<{ places: any[] }>("google-proxy", {
        action: "search",
        lat: activeHub.lat,
        lng: activeHub.lng,
        radiusMiles: activeHub.radius_miles,
        // Scope the actual Google search to this hub's meal focus (older hubs
        // created before that field existed just search generally).
        keyword: activeHub.meal_type ? MEAL_TYPE_SEARCH_KEYWORD[activeHub.meal_type] : undefined,
      });
      const rows = places.map((p) => ({
        hub_id: activeHub.id,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        google_place_id: p.google_place_id,
        rating: p.rating,
        review_count: p.review_count,
        price_level: p.price_level,
        phone: p.phone,
        cuisines: p.cuisines ?? [],
        photo_url: p.photo_url,
        source: "places",
        // Stamp every discovered restaurant with the hub's meal focus, since
        // the search itself was already scoped to it.
        meal_type: activeHub.meal_type,
      }));
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("restaurants")
          .upsert(rows, { onConflict: "hub_id,google_place_id", ignoreDuplicates: true });
        if (upsertError) throw upsertError;
      }
      await loadData();
    } catch (err: any) {
      setDiscoverError(err.message);
    } finally {
      setDiscovering(false);
    }
  }

  if (!activeHub) return null;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-bold uppercase bg-red-100 text-red-600 px-3 py-1 rounded-full">
            🔥 {activeHub.radius_miles}-Mile Foodie Quest
          </span>
          {activeHub.meal_type && (
            <span className="text-xs font-bold uppercase bg-teal-100 text-teal-700 px-3 py-1 rounded-full">
              {MEAL_TYPE_LABEL[activeHub.meal_type]}
            </span>
          )}
          <span className="text-xs text-stone-500">Origin: {activeHub.city ?? activeHub.label}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-stone-800">Visit Every High-Rated Spot in Your Area</h1>
        <p className="text-stone-500 mt-2 max-w-2xl">
          Discover curated gems, track unvisited places, rate dishes together, and conquer all {total} destinations
          within your {activeHub.radius_miles}-mile comfort radius!
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 bg-gradient-to-r from-orange-50 to-teal-50 rounded-xl p-4">
          <div>
            <p className="text-xs font-bold uppercase text-stone-500">Quest Progress</p>
            <p className="text-3xl font-extrabold text-orange-600">
              {total > 0 ? Math.round((conquered / total) * 100) : 0}%
            </p>
            <p className="text-xs text-emerald-600 font-semibold">{total - conquered} spots still to explore!</p>
          </div>
          <button
            onClick={discoverMore}
            disabled={discovering}
            className="ml-auto bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl px-5 py-3"
          >
            {discovering ? "Discovering…" : "✨ Discover More Local Spots"}
          </button>
          <button
            onClick={() => setShowAddPlace(true)}
            className="border-2 border-orange-300 text-orange-600 font-bold rounded-xl px-5 py-3"
          >
            + Add New Spot
          </button>
        </div>
        {discoverError && <p className="text-xs text-red-500 mt-2">{discoverError}</p>}
      </div>

      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl shadow-sm p-4 mb-6 flex items-center gap-3">
        <span className="text-2xl">☕</span>
        <p className="text-sm font-semibold">
          Start a tradition: try a new coffee, bakery, or breakfast spot with your partner every weekend.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-stone-100 rounded-full p-1">
          {(["all", "unvisited", "wishlist", "visited", "ignored"] as VisitedFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setVisitedFilter(f)}
              className={`text-xs font-bold rounded-full px-3 py-1.5 capitalize ${
                visitedFilter === f ? "bg-white shadow text-orange-600" : "text-stone-500"
              }`}
            >
              {f === "ignored" ? `🚫 Ignored${dismissedIds.size ? ` (${dismissedIds.size})` : ""}` : f}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="border border-stone-300 rounded-lg text-sm px-3 py-2">
          <option value="rating">⭐ Highest Rated</option>
          <option value="closest">📍 Closest to Home</option>
          <option value="reviews">🔥 Most Reviews</option>
          <option value="alpha">🔤 Alphabetical</option>
        </select>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">Radius:</span>
          {[5, 10, 15, 20, 30].filter((r) => r <= activeHub.radius_miles || r === activeHub.radius_miles).map((r) => (
            <button
              key={r}
              onClick={() => setRadiusFilter(r)}
              className={`text-xs font-bold rounded-full px-3 py-1.5 border ${
                radiusFilter === r ? "bg-orange-500 text-white border-orange-500" : "border-stone-300 text-stone-600"
              }`}
            >
              {r}mi
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-stone-400">Showing {filtered.length} places</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-dashed border-orange-200 p-12">
          <p className="text-4xl mb-2">{visitedFilter === "ignored" ? "🚫" : "🍽️"}</p>
          <p className="font-bold text-stone-700">
            {visitedFilter === "ignored" ? "Nothing ignored" : "No restaurants match yet"}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            {visitedFilter === "ignored"
              ? "Spots you remove from consideration (like a fast food place you'd rather skip) will show up here so you can bring them back anytime."
              : "Try \"Discover More Local Spots\" above to pull real nearby restaurants in, or add one manually."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              wishlisted={wishlistIds.has(r.id)}
              visited={visitedIds.has(r.id)}
              dismissed={dismissedIds.has(r.id)}
              onToggleWishlist={() => toggleWishlist(r)}
              onToggleDismiss={() => toggleDismiss(r)}
              onLogVisit={() => setLogVisitFor(r)}
            />
          ))}
        </div>
      )}

      {showAddPlace && <AddPlaceModal onClose={() => setShowAddPlace(false)} onSaved={loadData} />}
      {logVisitFor && (
        <LogVisitModal restaurant={logVisitFor} onClose={() => setLogVisitFor(null)} onSaved={loadData} />
      )}
    </div>
  );
}
