import { FlockSummary, Farm, Expense } from './supabase';
import { daysBetween } from './format';

/**
 * The intelligence layer.
 *
 * A farmer does not want a wall of figures — they want the answer to one
 * question: *is this batch going to make me money, and what is hurting it?*
 * Everything here turns raw rows into that answer, in plain language, so the
 * UI can lead with a conclusion and keep the arithmetic as supporting detail.
 *
 * Every projection is explicit about its assumptions. A number a farmer can't
 * trust is worse than no number, so nothing here invents data: if we can't
 * derive a feed rate from real logs, we say so rather than guessing.
 */

/** Industry reference points for commercial broilers, used as fallbacks only. */
export const BROILER = {
  /** Feed conversion ratio — kg feed per kg live weight. */
  goodFcr: 1.7,
  poorFcr: 2.1,
  /** Typical market age in days. */
  marketDays: 42,
  /** Share of total cost that feed normally represents. */
  feedShareOfCost: 0.7,
};

export type Health = 'good' | 'watch' | 'bad' | 'unknown';

export interface FlockProjection {
  flock: FlockSummary;
  dayAge: number;
  cycleDays: number;
  /** 0..1 progress through the growing cycle. */
  cycleProgress: number;
  daysToMarket: number;
  /** Profit already banked (revenue received minus costs incurred). */
  realisedProfit: number;
  /** Expected profit once remaining birds are sold, incl. estimated feed. */
  projectedProfit: number | null;
  /** Estimated cost of feed still to be eaten before market. */
  remainingFeedCost: number | null;
  /** Revenue needed per bird to break even. */
  breakEvenPerBird: number;
  marginPerBird: number | null;
  mortalityHealth: Health;
  fcrHealth: Health;
  /** One-line plain-language read on the batch. */
  verdict: string;
  verdictTone: 'success' | 'warning' | 'danger' | 'primary';
}

/**
 * Derive the farm's real cost of feed per kg from what it has actually spent,
 * rather than assuming a market rate. Returns null when there isn't enough
 * data to be honest about it.
 */
export function feedCostPerKg(expenses: Expense[], totalFeedKg: number): number | null {
  if (totalFeedKg <= 0) return null;
  const feedSpend = expenses
    .filter((e) => e.category === 'Feeds')
    .reduce((s, e) => s + Number(e.total_cost || 0), 0);
  if (feedSpend <= 0) return null;
  return feedSpend / totalFeedKg;
}

export function projectFlock(
  flock: FlockSummary,
  farm: Pick<Farm, 'standard_bird_price' | 'target_mortality_rate' | 'default_weeks_to_market'>,
  costPerKgFeed: number | null
): FlockProjection {
  const dayAge = Math.max(0, daysBetween(flock.date_arrived));
  const cycleDays = (farm.default_weeks_to_market || 6) * 7 || BROILER.marketDays;
  const daysToMarket = Math.max(0, cycleDays - dayAge);
  const cycleProgress = cycleDays > 0 ? Math.min(1, dayAge / cycleDays) : 0;

  const realisedProfit = flock.total_revenue - flock.total_cost;

  // Estimate the feed still to be eaten from this flock's own consumption
  // rate, not a textbook figure — a farm's real birds and real feed tell a
  // truer story than a breed chart.
  let remainingFeedCost: number | null = null;
  if (costPerKgFeed != null && dayAge > 0 && flock.feed_used_kg > 0 && flock.birds_remaining > 0) {
    const kgPerBirdPerDay = flock.feed_used_kg / dayAge / Math.max(1, flock.birds_remaining);
    const projectedKg = kgPerBirdPerDay * flock.birds_remaining * daysToMarket;
    remainingFeedCost = projectedKg * costPerKgFeed;
  }

  const price = farm.standard_bird_price || 0;
  let projectedProfit: number | null = null;
  if (price > 0) {
    const futureRevenue = flock.birds_remaining * price;
    projectedProfit = realisedProfit + futureRevenue - (remainingFeedCost ?? 0);
  }

  const breakEvenPerBird = flock.break_even_price ?? 0;
  const marginPerBird = price > 0 && breakEvenPerBird > 0 ? price - breakEvenPerBird : null;

  const targetMort = farm.target_mortality_rate || 0.05;
  const mortalityHealth: Health =
    flock.mortality_rate <= targetMort
      ? 'good'
      : flock.mortality_rate <= targetMort * 1.6
        ? 'watch'
        : 'bad';

  const fcrHealth: Health =
    !flock.fcr || flock.fcr <= 0
      ? 'unknown'
      : flock.fcr <= BROILER.goodFcr
        ? 'good'
        : flock.fcr <= BROILER.poorFcr
          ? 'watch'
          : 'bad';

  const { verdict, verdictTone } = buildVerdict({
    flock,
    projectedProfit,
    marginPerBird,
    mortalityHealth,
    daysToMarket,
    targetMort,
  });

  return {
    flock,
    dayAge,
    cycleDays,
    cycleProgress,
    daysToMarket,
    realisedProfit,
    projectedProfit,
    remainingFeedCost,
    breakEvenPerBird,
    marginPerBird,
    mortalityHealth,
    fcrHealth,
    verdict,
    verdictTone,
  };
}

function buildVerdict({
  flock,
  projectedProfit,
  marginPerBird,
  mortalityHealth,
  daysToMarket,
  targetMort,
}: {
  flock: FlockSummary;
  projectedProfit: number | null;
  marginPerBird: number | null;
  mortalityHealth: Health;
  daysToMarket: number;
  targetMort: number;
}): { verdict: string; verdictTone: 'success' | 'warning' | 'danger' | 'primary' } {
  // Order matters: lead with the thing that most threatens the batch, because
  // that is the decision the farmer has to make today.
  if (marginPerBird != null && marginPerBird < 0) {
    return {
      verdict: `Selling at your standard price loses KES ${Math.abs(Math.round(marginPerBird))} a bird. Raise the price or cut cost.`,
      verdictTone: 'danger',
    };
  }
  if (mortalityHealth === 'bad') {
    return {
      verdict: `Deaths are well past your ${Math.round(targetMort * 100)}% target — that is what is eating this batch.`,
      verdictTone: 'danger',
    };
  }
  if (mortalityHealth === 'watch') {
    return {
      verdict: `Deaths are creeping above your ${Math.round(targetMort * 100)}% target. Worth a look this week.`,
      verdictTone: 'warning',
    };
  }
  if (projectedProfit != null && projectedProfit < 0) {
    return {
      verdict: 'On today\'s numbers this batch finishes at a loss.',
      verdictTone: 'danger',
    };
  }
  if (flock.birds_remaining === 0) {
    return { verdict: 'Batch closed out. Final numbers below.', verdictTone: 'primary' };
  }
  if (daysToMarket <= 7 && daysToMarket > 0) {
    return {
      verdict: `Market weight in about ${daysToMarket} day${daysToMarket === 1 ? '' : 's'} — line up your buyers.`,
      verdictTone: 'success',
    };
  }
  if (marginPerBird != null && marginPerBird > 0) {
    return {
      verdict: `Making about KES ${Math.round(marginPerBird)} a bird at your standard price.`,
      verdictTone: 'success',
    };
  }
  return { verdict: 'Tracking normally.', verdictTone: 'primary' };
}

// ---------------------------------------------------------------------------
// Farm-level position
// ---------------------------------------------------------------------------
export interface FarmPosition {
  birdsOnFarm: number;
  activeCount: number;
  realisedProfit: number;
  projectedProfit: number | null;
  totalRevenue: number;
  totalCost: number;
  /** Profit per bird sold across all closed batches — the honest scorecard. */
  profitPerBirdSold: number | null;
  bestFlock: FlockProjection | null;
  worstFlock: FlockProjection | null;
  headline: string;
  headlineTone: 'success' | 'warning' | 'danger' | 'primary';
}

export function farmPosition(projections: FlockProjection[]): FarmPosition {
  const active = projections.filter(
    (p) => p.flock.status === 'Active' || p.flock.status === 'Selling'
  );

  const birdsOnFarm = active.reduce((s, p) => s + p.flock.birds_remaining, 0);
  const totalRevenue = projections.reduce((s, p) => s + p.flock.total_revenue, 0);
  const totalCost = projections.reduce((s, p) => s + p.flock.total_cost, 0);
  const realisedProfit = totalRevenue - totalCost;

  const projectable = projections.filter((p) => p.projectedProfit != null);
  const projectedProfit = projectable.length
    ? projectable.reduce((s, p) => s + (p.projectedProfit ?? 0), 0)
    : null;

  const birdsSold = projections.reduce((s, p) => s + p.flock.birds_sold, 0);
  const profitPerBirdSold = birdsSold > 0 ? realisedProfit / birdsSold : null;

  const ranked = [...projections]
    .filter((p) => p.flock.birds_sold > 0)
    .sort((a, b) => b.realisedProfit - a.realisedProfit);

  const bestFlock = ranked[0] ?? null;
  const worstFlock = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  const { headline, headlineTone } = buildHeadline({
    active,
    realisedProfit,
    projectedProfit,
    birdsOnFarm,
  });

  return {
    birdsOnFarm,
    activeCount: active.length,
    realisedProfit,
    projectedProfit,
    totalRevenue,
    totalCost,
    profitPerBirdSold,
    bestFlock,
    worstFlock,
    headline,
    headlineTone,
  };
}

function buildHeadline({
  active,
  realisedProfit,
  projectedProfit,
  birdsOnFarm,
}: {
  active: FlockProjection[];
  realisedProfit: number;
  projectedProfit: number | null;
  birdsOnFarm: number;
}): { headline: string; headlineTone: 'success' | 'warning' | 'danger' | 'primary' } {
  if (!active.length) {
    return {
      headline: birdsOnFarm === 0 ? 'No birds on the farm right now.' : 'No active batches.',
      headlineTone: 'primary',
    };
  }

  const failing = active.filter((p) => p.verdictTone === 'danger');
  if (failing.length) {
    return {
      headline:
        failing.length === 1
          ? `${failing[0].flock.flock_code} needs attention today.`
          : `${failing.length} batches need attention today.`,
      headlineTone: 'danger',
    };
  }

  const watching = active.filter((p) => p.verdictTone === 'warning');
  if (watching.length) {
    return { headline: `${watching[0].flock.flock_code} is worth watching this week.`, headlineTone: 'warning' };
  }

  if (projectedProfit != null && projectedProfit > 0) {
    return { headline: 'Every batch is tracking on target.', headlineTone: 'success' };
  }
  return { headline: 'All batches tracking normally.', headlineTone: 'primary' };
}

// ---------------------------------------------------------------------------
// Cost structure
// ---------------------------------------------------------------------------
export interface CostSlice {
  category: string;
  total: number;
  share: number;
}

export function costBreakdown(expenses: Expense[]): { slices: CostSlice[]; total: number; note: string | null } {
  const byCat = new Map<string, number>();
  expenses.forEach((e) => {
    const cat = e.category || 'Other';
    byCat.set(cat, (byCat.get(cat) ?? 0) + Number(e.total_cost || 0));
  });

  const total = [...byCat.values()].reduce((s, v) => s + v, 0);
  const slices = [...byCat.entries()]
    .map(([category, t]) => ({ category, total: t, share: total > 0 ? t / total : 0 }))
    .sort((a, b) => b.total - a.total);

  // Feed dominating far less than usual normally means costs are being logged
  // incompletely, which is worth flagging before the farmer trusts the totals.
  const feedShare = slices.find((s) => s.category === 'Feeds')?.share ?? 0;
  let note: string | null = null;
  if (total > 0 && feedShare > 0 && feedShare < 0.45) {
    note = 'Feed is usually about 70% of the cost of a batch. Yours is lower — some feed purchases may not be logged.';
  } else if (total > 0 && feedShare > 0.85) {
    note = 'Almost all your logged cost is feed. Labour, transport and vaccines may be missing.';
  }

  return { slices, total, note };
}

/** Build a daily mortality series for a sparkline, filling gaps with zero. */
export function dailySeries(
  logs: { log_date: string; birds_died: number | null; feed_used_kg: number | null }[],
  field: 'birds_died' | 'feed_used_kg',
  days = 14
): number[] {
  const today = new Date();
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const match = logs.filter((l) => l.log_date?.slice(0, 10) === key);
    out.push(match.reduce((s, l) => s + Number(l[field] ?? 0), 0));
  }
  return out;
}
