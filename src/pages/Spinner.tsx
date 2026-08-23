import { useEffect, useMemo, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { supabase } from "../lib/supabaseClient";
import { distanceMiles, priceLevelToDollars } from "../lib/distance";
import type { Restaurant } from "../lib/types";

export function Spinner() {
  const { activeHub, couple } = useCouple();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"spinner" | "bracket">("spinner");
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [bracket, setBracket] = useState<Restaurant[]>([]);
  const [round, setRound] = useState<Restaurant[]>([]);

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
  }, [activeHub?.id, couple?.id]);

  const unvisited = useMemo(() => {
    if (!activeHub) return [];
    return restaurants
      .filter((r) => !visitedIds.has(r.id))
      .map((r) => ({
        ...r,
        distance_mi: r.lat && r.lng ? distanceMiles(activeHub.lat, activeHub.lng, r.lat, r.lng) : undefined,
      }))
      .filter((r) => r.distance_mi == null || r.distance_mi <= activeHub.radius_miles);
  }, [restaurants, visitedIds, activeHub]);

  function spin() {
    if (unvisited.length === 0) return;
    setSpinning(true);
    setWinner(null);
    let ticks = 0;
    const interval = setInterval(() => {
      setWinner(unvisited[Math.floor(Math.random() * unvisited.length)]);
      ticks++;
      if (ticks > 12) {
        clearInterval(interval);
        setSpinning(false);
      }
    }, 120);
  }

  function startBracket() {
    if (unvisited.length < 2) return;
    const shuffled = [...unvisited].sort(() => Math.random() - 0.5).slice(0, 8);
    setBracket(shuffled);
    setRound(shuffled);
    setWinner(null);
  }

  function pick(choice: Restaurant, other: Restaurant) {
    const rest = round.filter((r) => r.id !== choice.id && r.id !== other.id);
    const nextRound = [...rest, choice];
    if (nextRound.length === 1) {
      setWinner(nextRound[0]);
      setRound([]);
    } else {
      setRound(nextRound);
    }
  }

  if (!activeHub) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 mb-6 justify-center">
        <button
          onClick={() => setMode("spinner")}
          className={`rounded-full px-5 py-2 text-sm font-bold ${mode === "spinner" ? "bg-orange-500 text-white" : "bg-white border border-stone-300 text-stone-600"}`}
        >
          🎲 Date Night Spinner
        </button>
        <button
          onClick={() => setMode("bracket")}
          className={`rounded-full px-5 py-2 text-sm font-bold ${mode === "bracket" ? "bg-indigo-600 text-white" : "bg-white border border-stone-300 text-stone-600"}`}
        >
          ⚔️ "This or That" Showdown
        </button>
      </div>

      {mode === "spinner" ? (
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-8 text-center">
          <p className="text-xs font-bold uppercase text-orange-500 mb-1">✨ Zero-Decision Dining</p>
          <h2 className="text-2xl font-extrabold text-stone-800 mb-2">Where Are We Eating Tonight?</h2>
          <p className="text-sm text-stone-500 mb-6">
            {unvisited.length} unvisited spot{unvisited.length === 1 ? "" : "s"} within {activeHub.radius_miles} miles of {activeHub.label}.
          </p>

          {winner && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-teal-50 rounded-xl p-5">
              <p className="text-2xl font-extrabold text-stone-800">{winner.name}</p>
              <p className="text-sm text-stone-500">
                {winner.city} · {priceLevelToDollars(winner.price_level)} {winner.rating ? `· ⭐ ${winner.rating}` : ""}
                {winner.distance_mi != null ? ` · ${winner.distance_mi.toFixed(1)} mi` : ""}
              </p>
            </div>
          )}

          <button
            onClick={spin}
            disabled={unvisited.length === 0 || spinning}
            className="bg-gradient-to-r from-orange-500 to-red-500 disabled:opacity-40 text-white font-extrabold rounded-xl px-8 py-4 text-lg"
          >
            {spinning ? "🎲 Spinning…" : "🎲 SPIN FOR TONIGHT'S SPOT!"}
          </button>
          {unvisited.length === 0 && (
            <p className="text-xs text-stone-400 mt-3">Head to Discover and pull in some restaurants first.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-8 text-center">
          <p className="text-xs font-bold uppercase text-indigo-500 mb-1">⚔️ Head-to-Head Battle</p>
          <h2 className="text-2xl font-extrabold text-stone-800 mb-4">"This or That" Date Night Showdown</h2>

          {winner ? (
            <div className="bg-indigo-50 rounded-xl p-6">
              <p className="text-xs font-bold uppercase text-indigo-500">🏆 Champion</p>
              <p className="text-2xl font-extrabold text-stone-800">{winner.name}</p>
            </div>
          ) : round.length >= 2 ? (
            <div className="grid grid-cols-2 gap-4">
              {[round[0], round[1]].map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => pick(r, [round[0], round[1]][1 - i])}
                  className="rounded-xl overflow-hidden border border-stone-200 hover:border-indigo-400 text-left"
                >
                  <div className="h-32 bg-stone-200">
                    {r.photo_url && <img src={r.photo_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-stone-800 text-sm">{r.name}</p>
                    <p className="text-xs text-stone-500">{r.distance_mi?.toFixed(1)} mi · ⭐ {r.rating ?? "—"}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">Click below to start a bracket of up to 8 unvisited spots.</p>
          )}

          <button
            onClick={startBracket}
            disabled={unvisited.length < 2}
            className="mt-6 bg-indigo-600 disabled:opacity-40 text-white font-bold rounded-xl px-6 py-3"
          >
            {bracket.length ? "🔄 Restart Showdown" : "Start Showdown"}
          </button>
        </div>
      )}
    </div>
  );
}
