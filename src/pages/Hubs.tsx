import { useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { callEdgeFunction, supabase } from "../lib/supabaseClient";

const MEAL_TYPE_LABEL: Record<string, string> = {
  coffee_breakfast: "☕ Coffee & Breakfast",
  lunch: "🥪 Lunch",
  dinner: "🌙 Dinner",
};

export function Hubs() {
  const { hubs, activeHub, switchHub, createHub, refresh } = useCouple();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [hubType, setHubType] = useState<"vacation" | "work" | "other">("vacation");
  const [mealType, setMealType] = useState<"coffee_breakfast" | "lunch" | "dinner" | "">("");
  const [radius, setRadius] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!mealType) {
      setError("Choose what this hub is for (coffee & breakfast, lunch, or dinner) before creating it.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const geo = await callEdgeFunction<any>("google-proxy", { action: "geocode", address });
      await createHub({
        label,
        address: geo.formatted_address,
        lat: geo.lat,
        lng: geo.lng,
        city: geo.city,
        state: geo.state,
        radius_miles: radius,
        hub_type: hubType,
        meal_type: mealType,
      });
      setAdding(false);
      setLabel("");
      setAddress("");
      setMealType("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteHub(id: string) {
    if (!confirm("Delete this quest hub and all its restaurants? This can't be undone.")) return;
    setDeleteError(null);
    setDeletingId(id);
    try {
      const { error: deleteErr } = await supabase.from("hubs").delete().eq("id", id);
      if (deleteErr) throw deleteErr;
      await refresh();
    } catch (err: any) {
      setDeleteError(err.message ?? "Something went wrong deleting that hub.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-extrabold text-stone-800 mb-1">🗺️ Quest Hubs & Vacation Areas</h2>
      <p className="text-sm text-stone-500 mb-6">Track foodie quests for your home, summer house, vacations & work bases.</p>

      {deleteError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
      )}

      <div className="flex flex-col gap-3">
        {hubs.map((hub) => (
          <div
            key={hub.id}
            className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
              hub.is_active ? "border-orange-400 bg-orange-50" : "border-stone-200 bg-white"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-800">{hub.label}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                  {hub.hub_type}
                </span>
                {hub.meal_type && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                    {MEAL_TYPE_LABEL[hub.meal_type]}
                  </span>
                )}
                {hub.is_active && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                    Active Radar
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                📍 {hub.address} · {hub.radius_miles}mi radius
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!hub.is_active && (
                <button
                  onClick={() => switchHub(hub.id)}
                  className="bg-stone-800 text-white text-xs font-bold rounded-full px-4 py-2"
                >
                  Switch
                </button>
              )}
              <button
                onClick={() => deleteHub(hub.id)}
                disabled={deletingId === hub.id}
                className="text-stone-400 hover:text-red-500 text-lg disabled:opacity-40"
                aria-label="Delete hub"
              >
                {deletingId === hub.id ? "…" : "🗑"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="mt-4 border border-dashed border-orange-300 rounded-xl p-4 flex flex-col gap-3">
          <input
            required
            placeholder="Label, e.g. Lake House"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={hubType}
              onChange={(e) => setHubType(e.target.value as any)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm flex-1"
            >
              <option value="vacation">Vacation Spot</option>
              <option value="work">Work Base</option>
              <option value="other">Other</option>
            </select>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm flex-1"
            >
              {[5, 10, 15, 20, 30].map((r) => (
                <option key={r} value={r}>
                  {r} miles
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">What's this hub for? *</label>
            <p className="text-xs text-stone-400 mb-1">
              Each hub searches for one meal occasion, so its results stay on-topic — add a separate hub for the same
              area if you also want a dinner-focused (or lunch, or breakfast) quest there.
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "coffee_breakfast", label: "☕ Coffee & Breakfast" },
                  { value: "lunch", label: "🥪 Lunch" },
                  { value: "dinner", label: "🌙 Dinner" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMealType(opt.value)}
                  className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
                    mealType === opt.value ? "bg-teal-500 text-white border-teal-500" : "border-stone-300 text-stone-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={busy || !mealType}
              className="flex-1 bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-lg px-3 py-2 text-sm"
            >
              {busy ? "Locating…" : "Create hub"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setMealType("");
                setError(null);
              }}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 w-full border-2 border-dashed border-orange-300 text-orange-600 font-semibold rounded-xl px-4 py-4 hover:bg-orange-50"
        >
          + Add Vacation Home, Summer House, or Work Base Quest
        </button>
      )}
    </div>
  );
}
