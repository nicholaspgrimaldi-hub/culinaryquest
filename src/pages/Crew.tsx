import { useEffect, useState } from "react";
import { useCouple } from "../context/CoupleProvider";
import { supabase } from "../lib/supabaseClient";
import type { CrewLink } from "../lib/types";

export function Crew() {
  const { couple } = useCouple();
  const [crew, setCrew] = useState<CrewLink[]>([]);
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    if (!couple) return;
    const { data } = await supabase.from("crew_links").select("*").eq("owner_couple_id", couple.id);
    setCrew((data as CrewLink[]) ?? []);
  }

  useEffect(() => {
    load();
  }, [couple?.id]);

  async function addCrew(e: React.FormEvent) {
    e.preventDefault();
    if (!couple || !name) return;
    await supabase.from("crew_links").insert({ owner_couple_id: couple.id, crew_name: name, member_names: members });
    setName("");
    setMembers("");
    setAdding(false);
    load();
  }

  async function toggleAttending(c: CrewLink) {
    await supabase.from("crew_links").update({ attending_tonight: !c.attending_tonight }).eq("id", c.id);
    load();
  }

  async function remove(id: string) {
    await supabase.from("crew_links").delete().eq("id", id);
    load();
  }

  const attendingCount = crew.filter((c) => c.attending_tonight).length;

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-extrabold text-stone-800">👥 Foodie Crew & Neighbors</h2>
        <p className="text-sm text-stone-500">Involve neighbors, friends, and couple duos working toward shared foodie goals.</p>
      </div>

      <div className="bg-orange-50 rounded-xl p-4 mb-4 text-sm text-stone-600">
        💞 Toggle "Attending Tonight" for any crew joining a double-date — the Spinner will factor in who's coming.
      </div>

      <div className="flex flex-col gap-3">
        {crew.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-stone-800">{c.crew_name}</p>
              {c.member_names && <p className="text-xs text-stone-500">Members: {c.member_names}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAttending(c)}
                className={`text-xs font-bold rounded-full px-3 py-2 ${
                  c.attending_tonight ? "bg-emerald-500 text-white" : "border border-stone-300 text-stone-600"
                }`}
              >
                {c.attending_tonight ? "✓ Attending Tonight" : "+ Add to Tonight"}
              </button>
              <button onClick={() => remove(c.id)} className="text-stone-400 hover:text-red-500">
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <form onSubmit={addCrew} className="mt-4 border border-dashed border-orange-300 rounded-xl p-4 flex flex-col gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Crew or couple name" required className="border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          <input value={members} onChange={(e) => setMembers(e.target.value)} placeholder="Member names (optional)" className="border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button className="flex-1 bg-orange-500 text-white font-semibold rounded-lg px-3 py-2 text-sm">Add</button>
            <button type="button" onClick={() => setAdding(false)} className="flex-1 border rounded-lg px-3 py-2 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-4 w-full border-2 border-dashed border-orange-300 text-orange-600 font-semibold rounded-xl px-4 py-3 hover:bg-orange-50">
          + Add Neighbors / Friends
        </button>
      )}

      <p className="text-center text-xs text-stone-400 mt-4">{attendingCount} squad member{attendingCount === 1 ? "" : "s"} attending tonight</p>
    </div>
  );
}
