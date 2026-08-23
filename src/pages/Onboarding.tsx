import { useEffect, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { callEdgeFunction, supabase } from "../lib/supabaseClient";

export function Onboarding() {
  const { couple, createCouple, createHub, refresh } = useCouple();
  const [coupleName, setCoupleName] = useState("Our Quest");
  const [address, setAddress] = useState("");
  const [hubLabel, setHubLabel] = useState("Primary Home Base");
  const [radius, setRadius] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteToken = new URLSearchParams(window.location.search).get("invite");
  const [redeeming, setRedeeming] = useState(!!inviteToken);

  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      try {
        await supabase.rpc("redeem_invite", { invite_token: inviteToken });
        window.history.replaceState({}, "", window.location.pathname);
        await refresh();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setRedeeming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);

  if (redeeming) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500">
        <div className="animate-pulse text-xl">💌 Joining your partner's quest…</div>
      </div>
    );
  }

  async function handleCreateCouple(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createCouple(coupleName);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateHub(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const geo = await callEdgeFunction<{
        formatted_address: string;
        lat: number;
        lng: number;
        city: string | null;
        state: string | null;
      }>("google-proxy", { action: "geocode", address });
      await createHub({
        label: hubLabel,
        address: geo.formatted_address,
        lat: geo.lat,
        lng: geo.lng,
        city: geo.city,
        state: geo.state,
        radius_miles: radius,
        hub_type: "primary",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-orange-100 p-8">
        {!couple ? (
          <form onSubmit={handleCreateCouple} className="flex flex-col gap-4">
            <h2 className="text-xl font-extrabold text-stone-800">Name your quest 🎯</h2>
            <p className="text-sm text-stone-500">
              This is the shared space you and your partner will use to track date nights together.
            </p>
            <input
              value={coupleName}
              onChange={(e) => setCoupleName(e.target.value)}
              className="border border-stone-300 rounded-xl px-4 py-3 text-sm"
              placeholder="e.g. Nick & Partner's Culinary Quest"
            />
            <button
              disabled={busy}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3"
            >
              {busy ? "Creating…" : "Start our quest"}
            </button>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>
        ) : (
          <form onSubmit={handleCreateHub} className="flex flex-col gap-4">
            <h2 className="text-xl font-extrabold text-stone-800">Set your first Quest Hub 🏡</h2>
            <p className="text-sm text-stone-500">
              Everything (distances, the radar map, restaurant suggestions) is calculated from this address.
            </p>
            <label className="text-xs font-bold text-stone-500 uppercase">Hub label</label>
            <input
              value={hubLabel}
              onChange={(e) => setHubLabel(e.target.value)}
              className="border border-stone-300 rounded-xl px-4 py-3 text-sm"
            />
            <label className="text-xs font-bold text-stone-500 uppercase">Home base address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="123 Main St, Boca Raton, FL"
              className="border border-stone-300 rounded-xl px-4 py-3 text-sm"
            />
            <label className="text-xs font-bold text-stone-500 uppercase">Date night radius</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="border border-stone-300 rounded-xl px-4 py-3 text-sm"
            >
              <option value={5}>5 miles (Close by)</option>
              <option value={10}>10 miles</option>
              <option value={15}>15 miles</option>
              <option value={20}>20 miles</option>
              <option value={30}>30 miles</option>
            </select>
            <button
              disabled={busy}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3"
            >
              {busy ? "Locating…" : "Create hub & start discovering"}
            </button>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
