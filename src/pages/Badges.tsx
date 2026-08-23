import { useEffect, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { supabase } from "../lib/supabaseClient";
import type { Badge, Visit } from "../lib/types";

const RANKS = [
  { min: 0, label: "Rookie Explorers", icon: "🌱" },
  { min: 5, label: "Foodie Duo", icon: "🍽️" },
  { min: 15, label: "Culinary Adventurers", icon: "🧭" },
  { min: 25, label: "Gastronomic Masters", icon: "🌟" },
];

export function Badges() {
  const { couple, activeHub } = useCouple();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    if (!couple || !activeHub) return;
    (async () => {
      const { data: badgeRows } = await supabase.from("badges").select("*").order("target");
      setBadges((badgeRows as Badge[]) ?? []);

      const { data: visits } = await supabase
        .from("visits")
        .select("*, restaurant:restaurants(*), ratings(*)")
        .eq("couple_id", couple.id);
      const list = (visits as Visit[]) ?? [];
      setVisitCount(list.length);

      const cuisineCount = (needle: string) =>
        list.filter((v) => v.restaurant?.cuisines?.some((c) => c.toLowerCase().includes(needle))).length;
      const localCount = list.filter((v) => v.restaurant?.city === activeHub.city).length;
      const luxuryCount = list.filter((v) => (v.restaurant?.price_level ?? 0) >= 4).length;
      const harmony = list.some((v) => {
        const scores = v.ratings ?? [];
        return scores.length >= 2 && scores.every((s) => s.score >= 9) && new Set(scores.map((s) => s.score)).size === 1;
      });

      const computed: Record<string, number> = {
        first_date: Math.min(list.length, 1),
        double_digit: Math.min(list.length, 10),
        gastronomic_masters: Math.min(list.length, 25),
        local_connoisseurs: Math.min(localCount, 5),
        regional_explorers: Math.min(list.length - localCount, 3),
        luxury_society: Math.min(luxuryCount, 2),
        pasta_vino: Math.min(cuisineCount("italian"), 4),
        prime_cut: Math.min(cuisineCount("steak"), 3),
        omakase: Math.min(cuisineCount("japanese") + cuisineCount("sushi"), 3),
        coastal_sunset: 0,
        couple_harmony: harmony ? 1 : 0,
      };
      setProgress(computed);

      if (badgeRows) {
        const upserts = badgeRows
          .filter((b: any) => computed[b.code] != null)
          .map((b: any) => ({
            couple_id: couple.id,
            badge_id: b.id,
            progress: computed[b.code],
            unlocked_at: computed[b.code] >= b.target ? new Date().toISOString() : null,
          }));
        if (upserts.length) await supabase.from("couple_badges").upsert(upserts, { onConflict: "couple_id,badge_id" });
      }
    })();
  }, [couple?.id, activeHub?.id]);

  const rank = [...RANKS].reverse().find((r) => visitCount >= r.min) ?? RANKS[0];
  const unlockedCount = badges.filter((b) => (progress[b.code] ?? 0) >= b.target).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-8 text-center mb-6">
        <p className="text-4xl">{rank.icon}</p>
        <p className="text-xs font-bold uppercase text-stone-500 mt-1">Couple Quest Rank</p>
        <h2 className="text-2xl font-extrabold text-stone-800">{rank.label}</h2>
        <p className="text-sm text-stone-500 mt-1">
          You've conquered {visitCount} spot{visitCount === 1 ? "" : "s"} within {activeHub?.radius_miles} miles!
        </p>
        <p className="mt-3 font-bold text-orange-600">
          Badges Unlocked: {unlockedCount} / {badges.length}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {badges.map((b) => {
          const p = progress[b.code] ?? 0;
          const unlocked = p >= b.target;
          return (
            <div
              key={b.id}
              className={`rounded-2xl border p-4 flex items-start gap-3 ${
                unlocked ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white opacity-90"
              }`}
            >
              <span className="text-3xl">{b.icon}</span>
              <div className="flex-1">
                <p className={`text-[10px] font-bold uppercase ${unlocked ? "text-emerald-600" : "text-stone-400"}`}>
                  {unlocked ? "Unlocked" : "Locked"}
                </p>
                <p className="font-bold text-stone-800">{b.label}</p>
                <p className="text-xs text-stone-500 mb-2">{b.description}</p>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${unlocked ? "bg-emerald-500" : "bg-orange-400"}`}
                    style={{ width: `${Math.min((p / b.target) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  Progress: {p} / {b.target}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
