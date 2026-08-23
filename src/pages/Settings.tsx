import { useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { useCouple } from "../context/CoupleProvider";
import { supabase } from "../lib/supabaseClient";

export function Settings() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const { couple, members, activeHub, refresh } = useCouple();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function saveName() {
    if (!session) return;
    setBusy(true);
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", session.user.id);
    await refreshProfile();
    setBusy(false);
  }

  async function createInvite() {
    if (!couple) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("couple_invites")
      .insert({ couple_id: couple.id, created_by: session?.user.id, partner_label: "Partner 2" })
      .select()
      .single();
    setBusy(false);
    if (error) return alert(error.message);
    setInviteLink(`${window.location.origin}/?invite=${data.token}`);
  }

  async function exportData() {
    if (!couple) return;
    setExporting(true);
    try {
      const [{ data: hubs }, { data: restaurants }, { data: visits }, { data: ratings }] = await Promise.all([
        supabase.from("hubs").select("*").eq("couple_id", couple.id),
        supabase.from("restaurants").select("*, hubs!inner(couple_id)").eq("hubs.couple_id", couple.id),
        supabase.from("visits").select("*").eq("couple_id", couple.id),
        supabase.from("ratings").select("*, visits!inner(couple_id)").eq("visits.couple_id", couple.id),
      ]);
      const payload = { exported_at: new Date().toISOString(), couple, hubs, restaurants, visits, ratings };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `culinary-quest-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
        <h2 className="text-lg font-extrabold text-stone-800 mb-1">⚙️ Profile & Preferences</h2>
        <p className="text-xs text-emerald-600 font-semibold mb-4">🔒 Real-Time Cloud Synced to Supabase</p>

        <p className="text-sm text-stone-600 mb-1">
          <span className="font-semibold">{session?.user.email}</span>
        </p>

        <label className="text-xs font-bold text-stone-500 uppercase mt-3 block">Your display name</label>
        <div className="flex gap-2 mt-1">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          <button onClick={saveName} disabled={busy} className="bg-orange-500 text-white text-sm font-semibold rounded-lg px-4 py-2">
            Save
          </button>
        </div>

        <button onClick={signOut} className="mt-4 text-xs text-stone-400 hover:text-red-500">
          Sign out
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
        <h3 className="font-bold text-stone-800 mb-1">💌 Invite Your Partner</h3>
        <p className="text-sm text-stone-500 mb-3">
          Your partner should have their own login so their ratings are really theirs. Generate a one-time invite
          link and send it to them.
        </p>
        <div className="flex flex-col gap-2 mb-3">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2 text-sm">
              <span>{m.profile?.full_name || m.profile?.avatar_url || "Member"}</span>
              <span className="text-xs font-bold text-orange-600">{m.partner_label}</span>
            </div>
          ))}
        </div>
        <button onClick={createInvite} disabled={busy} className="bg-indigo-600 text-white text-sm font-semibold rounded-lg px-4 py-2">
          Generate invite link
        </button>
        {inviteLink && (
          <div className="mt-3 bg-stone-50 rounded-lg p-3 text-xs break-all">
            {inviteLink}
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="block mt-2 text-orange-600 font-semibold"
            >
              Copy link
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
        <h3 className="font-bold text-stone-800 mb-1">💾 Data Backup</h3>
        <p className="text-sm text-stone-500 mb-3">Download everything — hubs, restaurants, visits, and ratings — as a JSON file you control.</p>
        <button onClick={exportData} disabled={exporting} className="bg-stone-800 text-white text-sm font-semibold rounded-lg px-4 py-2">
          {exporting ? "Exporting…" : "Export my data"}
        </button>
      </div>

      {activeHub && (
        <p className="text-center text-xs text-stone-400">
          Active hub: {activeHub.label} · {activeHub.radius_miles}mi radius · manage hubs from "Switch Hub" in the nav.
        </p>
      )}
    </div>
  );
}
