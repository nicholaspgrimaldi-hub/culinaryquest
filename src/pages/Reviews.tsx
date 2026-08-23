import { useEffect, useMemo, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { supabase } from "../lib/supabaseClient";
import type { Visit } from "../lib/types";

export function Reviews() {
  const { couple, members } = useCouple();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [sort, setSort] = useState<"recent" | "score">("recent");

  useEffect(() => {
    if (!couple) return;
    supabase
      .from("visits")
      .select("*, restaurant:restaurants(*), ratings(*)")
      .eq("couple_id", couple.id)
      .order("visited_date", { ascending: false })
      .then(({ data }) => setVisits((data as any) ?? []));
  }, [couple?.id]);

  const withScores = useMemo(() => {
    return visits.map((v) => {
      const scores = v.ratings ?? [];
      const avg = scores.length ? scores.reduce((s, r) => s + r.score, 0) / scores.length : null;
      return { ...v, avgScore: avg };
    });
  }, [visits]);

  const sorted = useMemo(() => {
    const list = [...withScores];
    if (sort === "score") list.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
    return list;
  }, [withScores, sort]);

  const partnerAvg = (userId?: string) => {
    if (!userId) return null;
    const scores = visits.flatMap((v) => v.ratings ?? []).filter((r) => r.user_id === userId);
    if (!scores.length) return null;
    return (scores.reduce((s, r) => s + r.score, 0) / scores.length).toFixed(1);
  };
  const coupleAvg = withScores.length
    ? (withScores.reduce((s, v) => s + (v.avgScore ?? 0), 0) / withScores.length).toFixed(1)
    : "0";

  return (
    <div>
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-extrabold text-stone-800">📖 Couple Culinary Memories</h1>
        <p className="text-sm text-stone-500 mb-4">Every memorable meal, shared rating, and favorite dish, in one dining scrapbook.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total Visited" value={String(visits.length)} />
          <Stat label={`${members[0]?.profile?.full_name ?? members[0]?.partner_label ?? "Partner 1"}'s Avg`} value={`${partnerAvg(members[0]?.user_id) ?? 0}/10`} />
          <Stat label={`${members[1]?.profile?.full_name ?? members[1]?.partner_label ?? "Partner 2"}'s Avg`} value={`${partnerAvg(members[1]?.user_id) ?? 0}/10`} />
          <Stat label="Couple Avg" value={`${coupleAvg}/10`} />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setSort("recent")} className={`text-xs font-bold rounded-full px-3 py-1.5 ${sort === "recent" ? "bg-orange-500 text-white" : "bg-white border"}`}>
          📅 Most Recent
        </button>
        <button onClick={() => setSort("score")} className={`text-xs font-bold rounded-full px-3 py-1.5 ${sort === "score" ? "bg-orange-500 text-white" : "bg-white border"}`}>
          ⭐ Highest Couple Score
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-dashed border-orange-200 p-12">
          <p className="text-4xl mb-2">📖</p>
          <p className="font-bold text-stone-700">No visited spots logged yet</p>
          <p className="text-sm text-stone-500 mt-1">Head to Discover, pick a spot, and tap "Log Visit & Rate" after your meal!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sorted.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-stone-800">{v.restaurant?.name}</p>
                  <p className="text-xs text-stone-500">{v.visited_date} · {v.occasion}</p>
                </div>
                {v.avgScore != null && (
                  <span className="text-sm font-extrabold bg-orange-100 text-orange-700 rounded-full px-3 py-1">{v.avgScore.toFixed(1)}/10</span>
                )}
              </div>
              {v.dishes_ordered?.length > 0 && (
                <p className="text-xs text-stone-500 mt-2">🍴 {v.dishes_ordered.join(", ")}</p>
              )}
              {v.memories && <p className="text-sm text-stone-600 mt-2 italic">"{v.memories}"</p>}
              {v.bill_total != null && <p className="text-xs text-stone-400 mt-2">💵 ~${v.bill_total}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-orange-50 rounded-xl p-3 text-center">
      <p className="text-xl font-extrabold text-stone-800">{value}</p>
      <p className="text-[10px] uppercase font-bold text-stone-500">{label}</p>
    </div>
  );
}
