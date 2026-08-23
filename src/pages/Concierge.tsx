import { useEffect, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { supabase, callEdgeFunction } from "../lib/supabaseClient";
import type { Restaurant } from "../lib/types";
import { ItineraryModal, type Itinerary } from "../components/ItineraryModal";

const ATMOSPHERES = [
  "Romantic & Candlelit Fine Dining",
  "Waterfront Sunset Stroll & Fresh Catch",
  "Lively Local Energy & Cocktails",
  "Cozy Hidden Gem & Wine Sanctuary",
  "High-End Omakase / Tasting Experience",
];
const BUDGETS = ["$$ (Moderate Chic)", "$$$ (Fine Dining)", "$$$$ (Ultra Luxury)"];

export function Concierge() {
  const { activeHub, couple, members } = useCouple();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [atmosphere, setAtmosphere] = useState(ATMOSPHERES[0]);
  const [budget, setBudget] = useState(BUDGETS[1]);
  const [busy, setBusy] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeHub) return;
    supabase
      .from("restaurants")
      .select("*")
      .eq("hub_id", activeHub.id)
      .then(({ data }) => {
        const list = (data as Restaurant[]) ?? [];
        setRestaurants(list);
        if (list[0]) setRestaurantId(list[0].id);
      });
  }, [activeHub?.id]);

  async function build(random = false) {
    if (!activeHub || !couple) return;
    const target = random ? restaurants[Math.floor(Math.random() * restaurants.length)] : restaurants.find((r) => r.id === restaurantId);
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const partner1 = members[0]?.profile?.full_name ?? members[0]?.partner_label ?? "Partner 1";
      const partner2 = members[1]?.profile?.full_name ?? members[1]?.partner_label ?? "Partner 2";
      const { itinerary: plan } = await callEdgeFunction<{ itinerary: Itinerary }>("ai-itinerary", {
        restaurantName: target.name,
        city: target.city ?? activeHub.city,
        atmosphere,
        budget,
        homeBaseLabel: activeHub.label,
        partner1,
        partner2,
      });
      setItinerary(plan);
      await supabase.from("ai_itineraries").insert({
        couple_id: couple.id,
        hub_id: activeHub.id,
        restaurant_id: target.id,
        atmosphere,
        budget,
        itinerary: plan,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!activeHub) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-indigo-500">AI Date Night Concierge</p>
            <h2 className="text-2xl font-extrabold text-stone-800 mb-1">Personalized Itinerary Builder</h2>
            <p className="text-sm text-stone-500">
              Gemini designs a complete romantic evening pairing an unvisited gem with pre-dinner and dessert stops.
            </p>
          </div>
          <button
            onClick={() => build(true)}
            disabled={busy || restaurants.length === 0}
            className="shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-40 text-white font-bold rounded-xl px-4 py-3 text-sm"
          >
            ✨ Surprise Us
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-6">
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Destination</label>
            <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm">
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Atmosphere</label>
            <select value={atmosphere} onChange={(e) => setAtmosphere(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm">
              {ATMOSPHERES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Budget</label>
            <select value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm">
              {BUDGETS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        {restaurants.length === 0 && <p className="text-xs text-stone-400 mt-3">Add some restaurants on Discover first.</p>}

        <button
          onClick={() => build(false)}
          disabled={busy || !restaurantId}
          className="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold rounded-xl px-4 py-3"
        >
          {busy ? "Gemini is planning your evening…" : "Build Itinerary"}
        </button>
      </div>

      {itinerary && <ItineraryModal itinerary={itinerary} onClose={() => setItinerary(null)} />}
    </div>
  );
}
