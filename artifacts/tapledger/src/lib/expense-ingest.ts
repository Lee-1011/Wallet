import { PAYMENT_METHODS, type PaymentMethod } from './ledger';

export interface ExpenseReviewDraft {
  amount?: string;
  merchant?: string;
  paymentMethod?: PaymentMethod;
  invalidFields: string[];
}

const MAX_AMOUNT = 1_000_000_000;
const MAX_MERCHANT_LENGTH = 90;
const QUICK_ENTRY_PARAMS = ['quickAdd', 'amount', 'merchant', 'paymentMethod'];

function paymentMethodFromParam(value: string): PaymentMethod | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'tng') return 'TNG eWallet';
  if (normalized === 'duitnow') return 'DuitNow QR';
  return PAYMENT_METHODS.find((method) => method.toLowerCase() === normalized);
}

export function parseQuickEntryParams(search: string): ExpenseReviewDraft | null {
  const params = new URLSearchParams(search);
  if (params.get('quickAdd')?.trim().toLowerCase() !== 'true') return null;

  const invalidFields: string[] = [];
  const rawAmount = params.get('amount');
  const amountValue = rawAmount?.trim() ?? '';
  const amountNumber = Number(amountValue);
  const amountIsValid =
    /^\d+(?:\.\d{1,2})?$/.test(amountValue) &&
    Number.isFinite(amountNumber) &&
    amountNumber >= 0.01 &&
    amountNumber <= MAX_AMOUNT;

  if (rawAmount !== null && !amountIsValid) invalidFields.push('amount');

  const rawMerchant = params.get('merchant');
  const merchant = rawMerchant
    ?.replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, MAX_MERCHANT_LENGTH);
  if (rawMerchant !== null && !merchant) invalidFields.push('merchant');

  const rawPaymentMethod = params.get('paymentMethod');
  const paymentMethod = rawPaymentMethod
    ? paymentMethodFromParam(rawPaymentMethod)
    : undefined;
  if (rawPaymentMethod !== null && !paymentMethod) {
    invalidFields.push('payment method');
  }

  return {
    ...(amountIsValid ? { amount: amountNumber.toFixed(2) } : {}),
    ...(merchant ? { merchant } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    invalidFields,
  };
}

export function stripQuickEntryParams(href: string): string {
  const url = new URL(href);
  QUICK_ENTRY_PARAMS.forEach((name) => url.searchParams.delete(name));
  if (new URLSearchParams(url.hash.slice(1)).has('quickAdd')) url.hash = '';
  return `${url.pathname}${url.search}${url.hash}`;
}
