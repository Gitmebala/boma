import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Expo Router's web build does a server-side render pass in Node before any
// browser exists — AsyncStorage's web implementation reaches for `window`
// synchronously and throws there. Guard every call so SSR gets a harmless
// empty session instead of crashing the render.
const isBrowser = () => typeof window !== 'undefined';
const SSRSafeStorage = {
  getItem: (key: string) => (isBrowser() ? AsyncStorage.getItem(key) : Promise.resolve(null)),
  setItem: (key: string, value: string) => (isBrowser() ? AsyncStorage.setItem(key, value) : Promise.resolve()),
  removeItem: (key: string) => (isBrowser() ? AsyncStorage.removeItem(key) : Promise.resolve()),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SSRSafeStorage,
    autoRefreshToken: isBrowser(),
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ---------- Database row types (mirrors the live Postgres schema) ----------

export type FarmType = 'broiler' | 'layers' | 'dairy' | 'goats_sheep' | 'crops' | 'fish';
export type MemberRole = 'owner' | 'logger';
export type FlockStatus = 'Active' | 'Selling' | 'Sold Out' | 'Closed';

export interface Profile {
  id: string;
  phone: string | null;
  full_name: string | null;
  language: 'en' | 'sw';
  created_at: string;
}

export interface Farm {
  id: string;
  name: string;
  county: string | null;
  owner_id: string;
  currency: string;
  standard_bird_price: number;
  default_weeks_to_market: number;
  target_mortality_rate: number;
  created_at: string;
}

export interface FarmMember {
  id: string;
  farm_id: string;
  user_id: string | null;
  invited_phone: string | null;
  role: MemberRole;
  can_view_money: boolean;
  status: 'active' | 'invited' | 'removed';
  created_at: string;
}

export interface Supplier {
  id: string;
  farm_id: string;
  name: string;
  phone: string | null;
  supplies: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  farm_id: string;
  name: string;
  phone: string | null;
  location: string | null;
  customer_type: string | null;
  notes: string | null;
  created_at: string;
}

export interface Flock {
  id: string;
  farm_id: string;
  flock_code: string;
  date_arrived: string;
  chicks_received: number;
  breed: string | null;
  supplier_id: string | null;
  cost_per_chick: number;
  weeks_to_market: number;
  status: FlockStatus;
  notes: string | null;
  birds_counted: number | null;
  date_counted: string | null;
  created_at: string;
}

export interface FlockSummary {
  flock_id: string;
  farm_id: string;
  flock_code: string;
  date_arrived: string;
  status: FlockStatus;
  chicks_received: number;
  deaths: number;
  mortality_rate: number;
  birds_sold: number;
  birds_remaining: number;
  feed_used_kg: number;
  total_live_weight_kg: number;
  fcr: number;
  total_cost: number;
  total_revenue: number;
  net_profit: number;
  break_even_price: number;
  first_week_deaths: number;
  first_week_mortality: number;
  birds_counted: number | null;
  birds_unaccounted: number | null;
}

export interface Vaccination {
  id: string;
  flock_id: string;
  age_days: number;
  vaccine_name: string;
  method: string | null;
  due_date: string;
  done: boolean;
  date_given: string | null;
  notes: string | null;
}

export interface DailyLog {
  id: string;
  flock_id: string;
  log_date: string;
  birds_died: number;
  cause_of_death: string | null;
  feed_used_kg: number | null;
  avg_weight_sample_kg: number | null;
  water_temp_note: string | null;
  observations: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  farm_id: string;
  flock_id: string | null;
  expense_date: string;
  category: string;
  item: string | null;
  quantity: number | null;
  unit: string | null;
  cost_per_unit: number;
  total_cost: number;
  supplier_id: string | null;
  payment_method: string | null;
  notes: string | null;
  receipt_url: string | null;
}

export interface Sale {
  id: string;
  farm_id: string;
  flock_id: string;
  customer_id: string;
  sale_date: string;
  birds_sold: number;
  avg_weight_per_bird: number | null;
  price_basis: 'Per Bird' | 'Per Kg';
  price: number;
  total_amount: number;
  amount_paid: number;
  payment_method: string | null;
  notes: string | null;
}

export interface Payment {
  id: string;
  farm_id: string;
  customer_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
}

export const EXPENSE_CATEGORIES = [
  'Feeds', 'Vitamins & Supplements', 'Vaccines', 'Medication', 'Chicks (extra)',
  'Labor', 'Transport', 'Litter / Sawdust', 'Water & Electricity', 'Equipment',
  'Housing / Repairs', 'Licenses & Fees', 'Marketing', 'Other',
];

export const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'Credit (unpaid)', 'Other'];

/** Methods a customer can actually hand you money by — "Credit (unpaid)" is
 *  meaningless for a payment that has already been received. */
export const RECEIPT_METHODS = ['M-Pesa', 'Cash', 'Bank Transfer', 'Cheque', 'Other'];

export type MoneyTxType =
  | 'own_money_added'
  | 'loan_received'
  | 'other_in'
  | 'household_drawing'
  | 'loan_repayment'
  | 'other_out';

/**
 * Cash movements that aren't a sale or a farm expense. Without these the
 * cash-on-hand figure can never reconcile: money you put in yourself, a loan,
 * or cash taken out for the household all move the till without touching a
 * single bird.
 */
export const MONEY_TX: { type: MoneyTxType; label: string; hint: string; direction: 'in' | 'out' }[] = [
  { type: 'own_money_added', label: 'Money I put in', hint: 'Your own cash into the farm', direction: 'in' },
  { type: 'loan_received', label: 'Loan received', hint: 'From a bank, sacco or person', direction: 'in' },
  { type: 'other_in', label: 'Other money in', hint: 'Anything else received', direction: 'in' },
  { type: 'household_drawing', label: 'Taken for household', hint: 'Farm cash used at home', direction: 'out' },
  { type: 'loan_repayment', label: 'Loan repayment', hint: 'Money paid back', direction: 'out' },
  { type: 'other_out', label: 'Other money out', hint: 'Anything else paid out', direction: 'out' },
];
export const CUSTOMER_TYPES = ['Individual', 'Hotel/Restaurant', 'Butchery', 'Retailer', 'Broker'];
