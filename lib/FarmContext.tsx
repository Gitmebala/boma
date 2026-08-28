import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, Farm, FarmType, MemberRole } from './supabase';
import { useAuth } from './AuthContext';

interface FarmCtx {
  farm: Farm | null;
  farmTypes: FarmType[];
  role: MemberRole | null;
  canViewMoney: boolean;
  loading: boolean;
  activeFarmType: FarmType | null;
  setActiveFarmType: (t: FarmType) => void;
  refresh: () => Promise<void>;
  createFarm: (name: string, county: string, types: FarmType[]) => Promise<Farm>;
}

const FarmContext = createContext<FarmCtx>(null as any);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [farmTypes, setFarmTypes] = useState<FarmType[]>([]);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [canViewMoney, setCanViewMoney] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFarmType, setActiveFarmType] = useState<FarmType | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    const { data: membership } = await supabase
      .from('farm_members')
      .select('*, farms(*)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (membership && (membership as any).farms) {
      const f = (membership as any).farms as Farm;
      setFarm(f);
      setRole(membership.role);
      setCanViewMoney(membership.can_view_money);
      const { data: types } = await supabase.from('farm_types').select('farm_type').eq('farm_id', f.id);
      const list = (types ?? []).map((t) => t.farm_type as FarmType);
      setFarmTypes(list);
      setActiveFarmType((prev) => prev ?? list[0] ?? null);
    } else {
      setFarm(null);
      setFarmTypes([]);
      setRole(null);
      setCanViewMoney(false);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const createFarm = async (name: string, county: string, types: FarmType[]) => {
    const { data: newFarm, error } = await supabase
      .from('farms')
      .insert({ name, county, owner_id: session!.user.id })
      .select()
      .single();
    if (error) throw error;
    if (types.length) {
      await supabase.from('farm_types').insert(types.map((t) => ({ farm_id: newFarm.id, farm_type: t })));
    }
    await refresh();
    return newFarm as Farm;
  };

  return (
    <FarmContext.Provider
      value={{ farm, farmTypes, role, canViewMoney, loading, activeFarmType, setActiveFarmType, refresh, createFarm }}>
      {children}
    </FarmContext.Provider>
  );
}

export const useFarm = () => useContext(FarmContext);
