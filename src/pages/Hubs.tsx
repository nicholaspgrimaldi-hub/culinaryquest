import { useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { callEdgeFunction, supabase } from "../lib/supabaseClient";

export function Hubs() {
  const { hubs, activeHub, switchHub, createHub, refresh } = useCouple();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [hubType, setHubType] = useState<"vacation" | "work" | "other">("vacation");
  const [radius, setRadius] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
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
      });
      setAdding(false);
      setLabel("");
      setAddress("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteHub(id: string) {
    if (!confirm("Delete this quest hub and all its restaurants? This can't be undone.")) return;
    await supabase.from("hubs").delete().eq("id", id);
    await refresh();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-extrabold text-stone-800 mb-1">🗺️ Quest Hubs & Vacation Areas</h2>
      <p className="text-sm text-stone-500 mb-6">Track foodie quests for your home, summer house, vacations & work bases.</p>

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
              <button onClick={() => deleteHub(hub.id)} className="text-stone-400 hover:text-red-500 text-lg">
                🗑
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
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className="flex-1 bg-orange-500 text-white font-semibold rounded-lg px-3 py-2 text-sm">
              {busy ? "Locating…" : "Create hub"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
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
