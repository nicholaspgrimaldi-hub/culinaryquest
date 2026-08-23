import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthProvider";
import { useCouple } from "../context/CoupleProvider";
import type { Restaurant } from "../lib/types";

export function LogVisitModal({ restaurant, onClose, onSaved }: { restaurant: Restaurant; onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth();
  const { couple, activeHub } = useCouple();
  const [myScore, setMyScore] = useState(9);
  const [visitedDate, setVisitedDate] = useState(new Date().toISOString().slice(0, 10));
  const [occasion, setOccasion] = useState("Romantic Date Night");
  const [wouldReturn, setWouldReturn] = useState<"yes" | "maybe" | "no">("yes");
  const [dishes, setDishes] = useState("");
  const [drinks, setDrinks] = useState("");
  const [seating, setSeating] = useState("");
  const [memories, setMemories] = useState("");
  const [billTotal, setBillTotal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!couple || !session) return;
    setBusy(true);
    setError(null);
    try {
      const { data: visit, error: visitErr } = await supabase
        .from("visits")
        .insert({
          restaurant_id: restaurant.id,
          couple_id: couple.id,
          hub_id: activeHub?.id,
          visited_date: visitedDate,
          occasion,
          would_return: wouldReturn,
          dishes_ordered: dishes ? dishes.split(",").map((d) => d.trim()).filter(Boolean) : [],
          drinks: drinks ? drinks.split(",").map((d) => d.trim()).filter(Boolean) : [],
          seating_notes: seating || null,
          memories: memories || null,
          bill_total: billTotal ? Number(billTotal) : null,
          created_by: session.user.id,
        })
        .select()
        .single();
      if (visitErr) throw visitErr;

      await supabase.from("ratings").insert({ visit_id: visit.id, user_id: session.user.id, score: myScore });

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-stone-800">⭐ Log Date Night Visit & Rating</h3>
            <p className="text-sm text-stone-500">{restaurant.name}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">My rating: {myScore.toFixed(1)} / 10</label>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={myScore}
              onChange={(e) => setMyScore(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Date visited</label>
              <input
                type="date"
                value={visitedDate}
                onChange={(e) => setVisitedDate(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Occasion</label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
              >
                <option>Romantic Date Night</option>
                <option>Anniversary</option>
                <option>Celebration</option>
                <option>Casual Dinner</option>
                <option>Double Date</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Would you go again together?</label>
            <div className="flex gap-2 mt-1">
              {(["yes", "maybe", "no"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWouldReturn(opt)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold border ${
                    wouldReturn === opt ? "bg-orange-500 text-white border-orange-500" : "border-stone-300 text-stone-600"
                  }`}
                >
                  {opt === "yes" ? "🔥 Yes!" : opt === "maybe" ? "🤔 Maybe" : "❌ One & Done"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Favorite dishes (comma separated)</label>
            <input
              value={dishes}
              onChange={(e) => setDishes(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Veal Chop Valdostana, Tiramisu"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Drinks / cocktails / wine</label>
            <input
              value={drinks}
              onChange={(e) => setDrinks(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Best table / seating advice</label>
            <input
              value={seating}
              onChange={(e) => setSeating(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Couple memories & notes</label>
            <textarea
              value={memories}
              onChange={(e) => setMemories(e.target.value)}
              rows={3}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Approx. bill total ($)</label>
            <input
              type="number"
              value={billTotal}
              onChange={(e) => setBillTotal(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 border rounded-lg px-3 py-2 text-sm font-semibold">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-semibold"
            >
              {busy ? "Saving…" : "Save Review & Scorecard"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
