/**
 * English dictionary — the canonical shape. `sw.ts` must match this
 * structure exactly (lib/i18n.tsx types every other locale against it).
 *
 * Started here rather than finished: infra is wired (lib/i18n.tsx), but
 * screens have not been converted to call t() yet. Tracked as a follow-up —
 * see task_99b0901b.
 */
export const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    continue: 'Continue',
    back: 'Back',
    close: 'Close',
    add: 'Add',
    edit: 'Edit',
    done: 'Done',
    optional: 'Optional',
    loading: 'Loading…',
    retry: 'Try again',
    today: 'Today',
    yesterday: 'Yesterday',
  },
  constants: {
    // Expense categories, payment methods, customer types — canonical value
    // stored in English, this is only the label shown to the farmer.
    Feeds: 'Feeds',
    'Vitamins & Supplements': 'Vitamins & Supplements',
    Vaccines: 'Vaccines',
    Medication: 'Medication',
    'Chicks (extra)': 'Chicks (extra)',
    Labor: 'Labor',
    Transport: 'Transport',
    'Litter / Sawdust': 'Litter / Sawdust',
    'Water & Electricity': 'Water & Electricity',
    Equipment: 'Equipment',
    'Housing / Repairs': 'Housing / Repairs',
    'Licenses & Fees': 'Licenses & Fees',
    Marketing: 'Marketing',
    Other: 'Other',
    Cash: 'Cash',
    'M-Pesa': 'M-Pesa',
    'Bank Transfer': 'Bank Transfer',
    Cheque: 'Cheque',
    'Credit (unpaid)': 'Credit (unpaid)',
  },
};
