import { Dict } from '../i18n';

/**
 * Kiswahili dictionary. Must match `en.ts`'s shape exactly — see the note
 * there. Kenyan farm vocabulary, not textbook Swahili (e.g. "kuku" not
 * "ndege" for birds, "chakula" not "lishe" for feed).
 */
export const sw: Dict = {
  common: {
    save: 'Hifadhi',
    cancel: 'Ghairi',
    delete: 'Futa',
    continue: 'Endelea',
    back: 'Rudi',
    close: 'Funga',
    add: 'Ongeza',
    edit: 'Hariri',
    done: 'Imekamilika',
    optional: 'Si lazima',
    loading: 'Inapakia…',
    retry: 'Jaribu tena',
    today: 'Leo',
    yesterday: 'Jana',
  },
  constants: {
    Feeds: 'Chakula',
    'Vitamins & Supplements': 'Vitamini',
    Vaccines: 'Chanjo',
    Medication: 'Dawa',
    'Chicks (extra)': 'Vifaranga (ziada)',
    Labor: 'Ibara',
    Transport: 'Usafiri',
    'Litter / Sawdust': 'Matandiko',
    'Water & Electricity': 'Maji na Umeme',
    Equipment: 'Vifaa',
    'Housing / Repairs': 'Banda / Ukarabati',
    'Licenses & Fees': 'Leseni na Ada',
    Marketing: 'Uuzaji',
    Other: 'Nyingine',
    Cash: 'Fedha taslimu',
    'M-Pesa': 'M-Pesa',
    'Bank Transfer': 'Uhamisho wa Benki',
    Cheque: 'Hundi',
    'Credit (unpaid)': 'Deni (halijalipwa)',
  },
};
