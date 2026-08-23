import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Couple, CoupleMember, Hub } from "../lib/types";
import { useAuth } from "./AuthProvider";

type CoupleContextValue = {
  couple: Couple | null;
  members: CoupleMember[];
  hubs: Hub[];
  activeHub: Hub | null;
  loading: boolean;
  refresh: () => Promise<void>;
  createCouple: (name: string) => Promise<Couple>;
  switchHub: (hubId: string) => Promise<void>;
  createHub: (hub: Omit<Hub, "id" | "couple_id" | "is_active" | "created_at">) => Promise<Hub>;
};

const CoupleContext = createContext<CoupleContextValue | undefined>(undefined);

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [members, setMembers] = useState<CoupleMember[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setCouple(null);
      setMembers([]);
      setHubs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: memberRows } = await supabase
      .from("couple_members")
      .select("*, couples(*)")
      .eq("user_id", session.user.id);

    const firstRow = memberRows?.[0] as any;
    if (!firstRow) {
      setCouple(null);
      setMembers([]);
      setHubs([]);
      setLoading(false);
      return;
    }
    const activeCouple = firstRow.couples as Couple;
    setCouple(activeCouple);

    const { data: allMembers } = await supabase
      .from("couple_members")
      .select("*, profile:profiles(*)")
      .eq("couple_id", activeCouple.id);
    setMembers((allMembers as any) ?? []);

    const { data: hubRows } = await supabase
      .from("hubs")
      .select("*")
      .eq("couple_id", activeCouple.id)
      .order("created_at", { ascending: true });
    setHubs((hubRows as Hub[]) ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createCouple(name: string): Promise<Couple> {
    if (!session) throw new Error("Not signed in");
    const { data: newCouple, error } = await supabase
      .from("couples")
      .insert({ name, created_by: session.user.id })
      .select()
      .single();
    if (error) throw error;
    await supabase
      .from("couple_members")
      .insert({ couple_id: newCouple.id, user_id: session.user.id, partner_label: "Partner 1" });
    await refresh();
    return newCouple as Couple;
  }

  async function createHub(hub: Omit<Hub, "id" | "couple_id" | "is_active" | "created_at">): Promise<Hub> {
    if (!couple) throw new Error("No couple yet");
    const makeActive = hubs.length === 0;
    const { data, error } = await supabase
      .from("hubs")
      .insert({ ...hub, couple_id: couple.id, is_active: makeActive })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as Hub;
  }

  async function switchHub(hubId: string) {
    if (!couple) return;
    await supabase.from("hubs").update({ is_active: false }).eq("couple_id", couple.id);
    await supabase.from("hubs").update({ is_active: true }).eq("id", hubId);
    await refresh();
  }

  const activeHub = hubs.find((h) => h.is_active) ?? hubs[0] ?? null;

  return (
    <CoupleContext.Provider
      value={{ couple, members, hubs, activeHub, loading, refresh, createCouple, switchHub, createHub }}
    >
      {children}
    </CoupleContext.Provider>
  );
}

export function useCouple() {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error("useCouple must be used within CoupleProvider");
  return ctx;
}
