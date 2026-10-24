export const CATEGORIES = [
  'Food & Beverage',
  'Transport',
  'Personal Care',
  'Groceries',
  'Shopping',
  'Bills & Utilities',
  'Health',
  'Entertainment',
  'Home',
  'Other',
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'Debit Card',
  'Credit Card',
  'TNG eWallet',
  'DuitNow QR',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: Category;
  paymentMethod: PaymentMethod;
  datetime: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerSettings {
  monthlyBudget: number;
  defaultPaymentMethod: PaymentMethod;
}

export interface LedgerData {
  transactions: Transaction[];
  settings: LedgerSettings;
}

const STORAGE_KEY = 'tapledger.local.v1';
const defaultData: LedgerData = {
  transactions: [],
  settings: { monthlyBudget: 2500, defaultPaymentMethod: 'TNG eWallet' },
};

export function readLedger(): LedgerData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultData;
    const parsed = JSON.parse(stored) as Partial<LedgerData>;
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      settings: {
        monthlyBudget: Number(parsed.settings?.monthlyBudget) || 2500,
        defaultPaymentMethod: PAYMENT_METHODS.includes(parsed.settings?.defaultPaymentMethod as PaymentMethod)
          ? parsed.settings!.defaultPaymentMethod!
          : 'TNG eWallet',
      },
    };
  } catch {
    return defaultData;
  }
}

export function persistLedger(data: LedgerData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function suggestCategory(description: string): Category | null {
  const value = description.trim().toLowerCase();
  if (/\bcoffee\b|\bcafe\b|\bkopi\b/.test(value)) return 'Food & Beverage';
  if (/\bgrab\b|\bmycar\b|\btaxi\b|\btrain\b|\bparking\b/.test(value)) return 'Transport';
  if (/\bwatsons\b|\bguardian\b|\bsalon\b/.test(value)) return 'Personal Care';
  if (/\bgrocer(y|ies)\b|\bmarket\b|\btesco\b|\bgiant\b|\bjaya grocer\b/.test(value)) return 'Groceries';
  return null;
}

export function localDateTimeInput(value: Date | string = new Date()): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function currency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function dayKey(value: string | Date): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function monthKey(value: string | Date): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-MY', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function downloadText(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(transactions: Transaction[]): string {
  const quote = (value: string | number | undefined) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [
    ['Date & time', 'Merchant / description', 'Amount (RM)', 'Category', 'Payment method', 'Notes'],
    ...transactions.map((item) => [
      item.datetime,
      item.merchant,
      item.amount.toFixed(2),
      item.category,
      item.paymentMethod,
      item.notes ?? '',
    ]),
  ];
  return rows.map((row) => row.map(quote).join(',')).join('\r\n');
}
