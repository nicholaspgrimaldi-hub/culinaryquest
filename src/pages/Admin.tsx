import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import type { AdSettings, Profile } from "../lib/types";

export function Admin() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [coupleCount, setCoupleCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const [ads, setAds] = useState<AdSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setMembers((data as Profile[]) ?? []));
    supabase.from("couples").select("id", { count: "exact", head: true }).then(({ count }) => setCoupleCount(count ?? 0));
    supabase.from("visits").select("id", { count: "exact", head: true }).then(({ count }) => setVisitCount(count ?? 0));
    supabase.from("ad_settings").select("*").eq("id", true).maybeSingle().then(({ data }) => setAds(data as AdSettings));
  }, [profile?.role]);

  if (profile?.role !== "admin") {
    return (
      <div className="max-w-md mx-auto text-center bg-white rounded-2xl border border-orange-100 shadow-sm p-10">
        <p className="text-3xl mb-2">🔒</p>
        <p className="font-bold text-stone-700">Admins only</p>
        <p className="text-sm text-stone-500 mt-1">
          Ask an existing admin to run: <code className="bg-stone-100 px-1 rounded">update profiles set role='admin' where id='&lt;your-user-id&gt;'</code> in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  async function saveAds() {
    if (!ads) return;
    setBusy(true);
    await supabase.from("ad_settings").update(ads).eq("id", true);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-800">🛠 Admin</h1>
        <p className="text-sm text-stone-500">Members, traffic, and site configuration.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-orange-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-stone-800">{members.length}</p>
          <p className="text-[10px] uppercase font-bold text-stone-500">Members</p>
        </div>
        <div className="bg-white rounded-2xl border border-orange-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-stone-800">{coupleCount}</p>
          <p className="text-[10px] uppercase font-bold text-stone-500">Couples</p>
        </div>
        <div className="bg-white rounded-2xl border border-orange-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-stone-800">{visitCount}</p>
          <p className="text-[10px] uppercase font-bold text-stone-500">Logged Visits</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
        <h3 className="font-bold text-stone-800 mb-1">📈 Traffic</h3>
        <p className="text-sm text-stone-500 mb-2">
          Page views, visitors, and top pages are tracked by Vercel Web Analytics automatically once enabled on the
          project — no extra code needed.
        </p>
        <a
          href="https://vercel.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-orange-600"
        >
          Open Vercel Analytics ↗
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
        <h3 className="font-bold text-stone-800 mb-3">👤 Members</h3>
        <div className="flex flex-col divide-y">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>{m.full_name || m.id}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${m.role === "admin" ? "bg-indigo-100 text-indigo-600" : "bg-stone-100 text-stone-500"}`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
        <h3 className="font-bold text-stone-800 mb-1">📢 Google AdSense</h3>
        <p className="text-sm text-stone-500 mb-3">
          Ad slots are already reserved in the app (sidebar, footer, in-feed) but stay hidden until you turn this on
          and fill in your AdSense IDs below — no redeploy needed.
        </p>
        {ads && (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={ads.enabled} onChange={(e) => setAds({ ...ads, enabled: e.target.checked })} />
              Ads enabled
            </label>
            <input
              placeholder="Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)"
              value={ads.publisher_id ?? ""}
              onChange={(e) => setAds({ ...ads, publisher_id: e.target.value })}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Sidebar ad slot ID"
              value={ads.slot_sidebar ?? ""}
              onChange={(e) => setAds({ ...ads, slot_sidebar: e.target.value })}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Footer ad slot ID"
              value={ads.slot_footer ?? ""}
              onChange={(e) => setAds({ ...ads, slot_footer: e.target.value })}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="In-feed ad slot ID"
              value={ads.slot_infeed ?? ""}
              onChange={(e) => setAds({ ...ads, slot_infeed: e.target.value })}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={saveAds} disabled={busy} className="bg-orange-500 text-white text-sm font-semibold rounded-lg px-4 py-2">
              {busy ? "Saving…" : saved ? "Saved ✓" : "Save ad settings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
