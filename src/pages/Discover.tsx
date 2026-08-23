import { useEffect, useMemo, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { callEdgeFunction, supabase } from "../lib/supabaseClient";
import { distanceMiles } from "../lib/distance";
import type { Restaurant } from "../lib/types";
import { RestaurantCard } from "../components/RestaurantCard";
import { AddPlaceModal } from "../components/AddPlaceModal";
import { LogVisitModal } from "../components/LogVisitModal";

type VisitedFilter = "all" | "unvisited" | "wishlist" | "visited";
type SortKey = "rating" | "closest" | "reviews" | "alpha";

export function Discover() {
  const { activeHub, couple } = useCouple();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [radiusFilter, setRadiusFilter] = useState<number>(activeHub?.radius_miles ?? 5);
  const [sort, setSort] = useState<SortKey>("rating");
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilter>("unvisited");
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [logVisitFor, setLogVisitFor] = useState<Restaurant | null>(null);

  async function loadData() {
    if (!activeHub || !couple) return;
    const { data: rest } = await supabase.from("restaurants").select("*").eq("hub_id", activeHub.id);
    setRestaurants((rest as Restaurant[]) ?? []);

    const { data: visits } = await supabase.from("visits").select("restaurant_id").eq("couple_id", couple.id);
    setVisitedIds(new Set((visits ?? []).map((v: any) => v.restaurant_id)));

    const { data: flags } = await supabase
      .from("restaurant_flags")
      .select("restaurant_id, wishlisted")
      .eq("couple_id", couple.id)
      .eq("wishlisted", true);
    setWishlistIds(new Set((flags ?? []).map((f: any) => f.restaurant_id)));
  }

  useEffect(() => {
    loadData();
    if (activeHub) setRadiusFilter(activeHub.radius_miles);
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
    if (visitedFilter === "unvisited") list = list.filter((r) => !visitedIds.has(r.id));
    if (visitedFilter === "visited") list = list.filter((r) => visitedIds.has(r.id));
    if (visitedFilter === "wishlist") list = list.filter((r) => wishlistIds.has(r.id));

    const sorted = [...list].sort((a, b) => {
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === "closest") return (a.distance_mi ?? 999) - (b.distance_mi ?? 999);
      if (sort === "reviews") return (b.review_count ?? 0) - (a.review_count ?? 0);
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [withDistance, radiusFilter, visitedFilter, wishlistIds, visitedIds, sort]);

  const conquered = visitedIds.size;
  const total = restaurants.length;

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
      }));
      if (rows.length > 0) {
        await supabase.from("restaurants").upsert(rows, { onConflict: "hub_id,google_place_id", ignoreDuplicates: true });
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

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-stone-100 rounded-full p-1">
          {(["all", "unvisited", "wishlist", "visited"] as VisitedFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setVisitedFilter(f)}
              className={`text-xs font-bold rounded-full px-3 py-1.5 capitalize ${
                visitedFilter === f ? "bg-white shadow text-orange-600" : "text-stone-500"
              }`}
            >
              {f}
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
          <p className="text-4xl mb-2">🍽️</p>
          <p className="font-bold text-stone-700">No restaurants match yet</p>
          <p className="text-sm text-stone-500 mt-1">
            Try "Discover More Local Spots" above to pull real nearby restaurants in, or add one manually.
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
              onToggleWishlist={() => toggleWishlist(r)}
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
import { useEffect, useMemo, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { callEdgeFunction, supabase } from "../lib/supabaseClient";
import { distanceMiles } from "../lib/distance";
import type { Restaurant } from "../lib/types";
import { RestaurantCard } from "../components/RestaurantCard";
import { AddPlaceModal } from "../components/AddPlaceModal";
import { LogVisitModal } from "../components/LogVisitModal";
import { ItineraryModal, type Itinerary } from "../components/ItineraryModal";

type VisitedFilter = "all" | "unvisited" | "wishlist" | "visited";
type SortKey = "rating" | "closest" | "reviews" | "alpha";

export function Discover() {
  const { activeHub, couple, members } = useCouple();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [radiusFilter, setRadiusFilter] = useState<number>(activeHub?.radius_miles ?? 5);
  const [sort, setSort] = useState<SortKey>("rating");
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilter>("unvisited");
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [logVisitFor, setLogVisitFor] = useState<Restaurant | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);

  async function loadData() {
    if (!activeHub || !couple) return;
    const { data: rest } = await supabase.from("restaurants").select("*").eq("hub_id", activeHub.id);
    setRestaurants((rest as Restaurant[]) ?? []);

    const { data: visits } = await supabase.from("visits").select("restaurant_id").eq("couple_id", couple.id);
    setVisitedIds(new Set((visits ?? []).map((v: any) => v.restaurant_id)));

    const { data: flags } = await supabase
      .from("restaurant_flags")
      .select("restaurant_id, wishlisted")
      .eq("couple_id", couple.id)
      .eq("wishlisted", true);
    setWishlistIds(new Set((flags ?? []).map((f: any) => f.restaurant_id)));
  }

  useEffect(() => {
    loadData();
    if (activeHub) setRadiusFilter(activeHub.radius_miles);
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
    if (visitedFilter === "unvisited") list = list.filter((r) => !visitedIds.has(r.id));
    if (visitedFilter === "visited") list = list.filter((r) => visitedIds.has(r.id));
    if (visitedFilter === "wishlist") list = list.filter((r) => wishlistIds.has(r.id));

    const sorted = [...list].sort((a, b) => {
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === "closest") return (a.distance_mi ?? 999) - (b.distance_mi ?? 999);
      if (sort === "reviews") return (b.review_count ?? 0) - (a.review_count ?? 0);
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [withDistance, radiusFilter, visitedFilter, wishlistIds, visitedIds, sort]);

  const conquered = visitedIds.size;
  const total = restaurants.length;

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
      }));
      if (rows.length > 0) {
        await supabase.from("restaurants").upsert(rows, { onConflict: "hub_id,google_place_id", ignoreDuplicates: true });
      }
      await loadData();
    } catch (err: any) {
      setDiscoverError(err.message);
    } finally {
      setDiscovering(false);
    }
  }

  async function planAI(r: Restaurant) {
    if (!couple || !activeHub) return;
    setPlanningId(r.id);
    try {
      const partner1 = members[0]?.profile?.full_name ?? members[0]?.partner_label ?? "Partner 1";
      const partner2 = members[1]?.profile?.full_name ?? members[1]?.partner_label ?? "Partner 2";
      const { itinerary: plan } = await callEdgeFunction<{ itinerary: Itinerary }>("ai-itinerary", {
        restaurantName: r.name,
        city: r.city ?? activeHub.city,
        homeBaseLabel: activeHub.label,
        partner1,
        partner2,
      });
      setItinerary(plan);
      await supabase.from("ai_itineraries").insert({
        couple_id: couple.id,
        hub_id: activeHub.id,
        restaurant_id: r.id,
        itinerary: plan,
      });
    } catch (err: any) {
      alert(`Couldn't build a plan: ${err.message}`);
    } finally {
      setPlanningId(null);
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

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-stone-100 rounded-full p-1">
          {(["all", "unvisited", "wishlist", "visited"] as VisitedFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setVisitedFilter(f)}
              className={`text-xs font-bold rounded-full px-3 py-1.5 capitalize ${
                visitedFilter === f ? "bg-white shadow text-orange-600" : "text-stone-500"
              }`}
            >
              {f}
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
          <p className="text-4xl mb-2">🍽️</p>
          <p className="font-bold text-stone-700">No restaurants match yet</p>
          <p className="text-sm text-stone-500 mt-1">
            Try "Discover More Local Spots" above to pull real nearby restaurants in, or add one manually.
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
              onToggleWishlist={() => toggleWishlist(r)}
              onLogVisit={() => setLogVisitFor(r)}
              onPlanAI={() => planAI(r)}
            />
          ))}
        </div>
      )}

      {showAddPlace && <AddPlaceModal onClose={() => setShowAddPlace(false)} onSaved={loadData} />}
      {logVisitFor && (
        <LogVisitModal restaurant={logVisitFor} onClose={() => setLogVisitFor(null)} onSaved={loadData} />
      )}
      {itinerary && <ItineraryModal itinerary={itinerary} onClose={() => setItinerary(null)} />}
      {planningId && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 font-semibold text-stone-600">✨ Gemini is planning your evening…</div>
        </div>
      )}
    </div>
  );
}
