import { supabase, FlockSummary } from './supabase';
import { daysBetween } from './format';

export type AlertSeverity = 'overdue' | 'attention' | 'fine';

export interface BomaAlert {
  id: string;
  icon: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  action: string;
  href?: string;
}

/**
 * Mirrors refreshAlerts() from the original Kuku Pro Max Code.gs — same
 * signals, same thresholds, computed live from Supabase instead of sheet formulas.
 */
export async function buildAlerts(farmId: string): Promise<BomaAlert[]> {
  const alerts: BomaAlert[] = [];

  const { data: farm } = await supabase.from('farms').select('target_mortality_rate').eq('id', farmId).single();
  const targetMortality = farm?.target_mortality_rate ?? 0.05;

  const { data: flocks } = await supabase
    .from('flock_summary')
    .select('*')
    .eq('farm_id', farmId)
    .not('status', 'in', '(Closed,"Sold Out")');

  (flocks as FlockSummary[] | null)?.forEach((f) => {
    if (f.mortality_rate > targetMortality) {
      alerts.push({
        id: `mortality-${f.flock_id}`,
        icon: 'warning',
        severity: 'overdue',
        title: 'High mortality',
        detail: `${f.flock_code} mortality is ${(f.mortality_rate * 100).toFixed(1)}% (target ${(targetMortality * 100).toFixed(0)}%).`,
        action: 'Check water, heat, ventilation and feed quality.',
        href: `/(tabs)/flocks/${f.flock_id}`,
      });
    }
    if (f.birds_unaccounted !== null && f.birds_unaccounted !== undefined) {
      if (f.birds_unaccounted > 0) {
        alerts.push({
          id: `missing-${f.flock_id}`,
          icon: 'search',
          severity: 'overdue',
          title: 'Birds missing',
          detail: `${f.flock_code}: records say ${Math.round(f.birds_unaccounted)} more bird(s) than counted.`,
          action: 'Check for unlogged deaths or sales.',
          href: `/(tabs)/flocks/${f.flock_id}`,
        });
      } else if (f.birds_unaccounted < 0) {
        alerts.push({
          id: `overcount-${f.flock_id}`,
          icon: 'search',
          severity: 'attention',
          title: 'Count doesn\'t match',
          detail: `${f.flock_code}: counted ${Math.abs(Math.round(f.birds_unaccounted))} more than records show.`,
          action: 'A death or sale was probably counted twice.',
          href: `/(tabs)/flocks/${f.flock_id}`,
        });
      }
    }
  });

  const flockIds = (flocks ?? []).map((f: any) => f.flock_id);
  if (flockIds.length) {
    const { data: vax } = await supabase
      .from('vaccinations')
      .select('*, flocks(flock_code)')
      .in('flock_id', flockIds)
      .eq('done', false);

    vax?.forEach((v: any) => {
      const d = daysBetween(v.due_date);
      if (d > 0) {
        alerts.push({
          id: `vax-overdue-${v.id}`,
          icon: 'medkit',
          severity: 'overdue',
          title: 'Vaccine overdue',
          detail: `${v.flocks?.flock_code}: ${v.vaccine_name} was due ${d} day(s) ago.`,
          action: 'Give it today, then mark it done.',
          href: `/(tabs)/flocks/${v.flock_id}`,
        });
      } else if (d >= -3) {
        alerts.push({
          id: `vax-due-${v.id}`,
          icon: 'medkit',
          severity: 'attention',
          title: 'Vaccine due soon',
          detail: `${v.flocks?.flock_code}: ${v.vaccine_name} due in ${Math.abs(d)} day(s).`,
          action: 'Buy the vaccine and prepare.',
          href: `/(tabs)/flocks/${v.flock_id}`,
        });
      }
    });
  }

  // Water intake drops 12-24h before a sick bird is visible to the eye —
  // the earliest signal a farmer has, and until now nothing watched it.
  if (flockIds.length) {
    const codeByFlock = new Map((flocks ?? []).map((f: any) => [f.flock_id, f.flock_code]));
    const since = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
    const { data: waterLogs } = await supabase
      .from('daily_logs')
      .select('flock_id, log_date, water_litres')
      .in('flock_id', flockIds)
      .gte('log_date', since)
      .not('water_litres', 'is', null)
      .order('log_date', { ascending: false });

    const byFlock = new Map<string, { log_date: string; water_litres: number }[]>();
    (waterLogs ?? []).forEach((l: any) => {
      const list = byFlock.get(l.flock_id) ?? [];
      list.push(l);
      byFlock.set(l.flock_id, list);
    });

    byFlock.forEach((entries, flockId) => {
      // entries[0] is the latest day (query ordered descending); compare it
      // against the flock's own trailing average, not a breed-chart figure —
      // house size and weather vary too much for one number to fit every farm.
      const [latest, ...prior] = entries;
      if (!latest || prior.length === 0) return;
      const avgPrior = prior.reduce((s, e) => s + Number(e.water_litres), 0) / prior.length;
      if (avgPrior <= 0) return;

      const dropPct = (avgPrior - Number(latest.water_litres)) / avgPrior;
      if (dropPct > 0.2) {
        alerts.push({
          id: `water-drop-${flockId}-${latest.log_date}`,
          icon: 'water',
          severity: 'attention',
          title: 'Water intake dropped',
          detail: `${codeByFlock.get(flockId) ?? 'A batch'}: ${Math.round(dropPct * 100)}% below its own recent average.`,
          action: 'Often the earliest sign of illness — check the birds today, before anything looks visibly wrong.',
          href: `/(tabs)/flocks/${flockId}`,
        });
      }
    });
  }

  const { data: balances } = await supabase
    .from('customer_balances')
    .select('*')
    .eq('farm_id', farmId)
    .gt('balance', 0);

  balances?.forEach((b: any) => {
    const age = b.last_purchase ? daysBetween(b.last_purchase) : null;
    if (age !== null && age > 30) {
      alerts.push({
        id: `debt-${b.customer_id}`,
        icon: 'cash',
        severity: 'overdue',
        title: 'Debt overdue',
        detail: `${b.name} owes KES ${Math.round(b.balance).toLocaleString()}, ${age} days old.`,
        action: 'Send a reminder from Debt Aging.',
        href: '/(tabs)/money',
      });
    }
  });

  const { data: openTasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, category')
    .eq('farm_id', farmId)
    .eq('done', false);

  openTasks?.forEach((t: any) => {
    const d = daysBetween(t.due_date);
    if (d > 0) {
      alerts.push({
        id: `task-overdue-${t.id}`,
        icon: 'checkbox',
        severity: 'overdue',
        title: 'Task overdue',
        detail: `${t.title} was due ${d} day(s) ago.`,
        action: `${t.category} task — mark it done once complete.`,
        href: '/(tabs)/more/tasks',
      });
    } else if (d === 0) {
      alerts.push({
        id: `task-due-${t.id}`,
        icon: 'checkbox',
        severity: 'attention',
        title: 'Task due today',
        detail: t.title,
        action: `${t.category} task.`,
        href: '/(tabs)/more/tasks',
      });
    }
  });

  const severityOrder: Record<AlertSeverity, number> = { overdue: 0, attention: 1, fine: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
