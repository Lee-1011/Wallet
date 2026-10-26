import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BarChart3, CalendarDays, CarFront, Check, CircleHelp,
  Coffee, CreditCard, FileText, Home, ListFilter, MoreHorizontal, Pencil, Plus, Receipt, Search,
  Settings as SettingsIcon, ShoppingBag, SlidersHorizontal, Trash2, Wallet, X,
} from 'lucide-react';
import {
  CATEGORIES, PAYMENT_METHODS, type Category, type LedgerData, type PaymentMethod, type Transaction,
  currency, dayKey, downloadText, exportCsv, formatDateTime, localDateTimeInput, monthKey,
  persistLedger, readLedger, suggestCategory,
} from './lib/ledger';
import { parseQuickEntryParams, stripQuickEntryParams, type ExpenseReviewDraft } from './lib/expense-ingest';
import './index.css';

const categoryColors = ['#2e654f', '#d47c58', '#e3b55d', '#6e9aa0', '#a89abe', '#85a77c', '#bd827b', '#879b9d', '#a8a17d', '#b4a58d'];
const initialData = readLedger();

function App() {
  const [data, setData] = useState<LedgerData>(initialData);
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'delete' | 'clear' | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
  const [quickEntryPrefill, setQuickEntryPrefill] = useState<ExpenseReviewDraft | null>(null);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState('');
  const [location] = useLocation();
  const quickAddProcessed = useRef(false);

  useEffect(() => {
    if (quickAddProcessed.current) return;
    quickAddProcessed.current = true;
    const prefill = parseQuickEntryParams(window.location.search);
    if (!prefill) return;

    setQuickEntryPrefill(prefill);
    setActiveTransaction(null);
    setActiveModal('add');
    window.history.replaceState(
      window.history.state,
      '',
      stripQuickEntryParams(window.location.href),
    );
  }, []);

  const updateData = (next: LedgerData) => {
    try {
      persistLedger(next);
      setData(next);
      setStorageError('');
      return true;
    } catch (error) {
      console.error('Could not save TapLedger data on this device', error);
      setToast('');
      setStorageError('Could not save on this device. Your changes were not applied. Check available storage or browser settings, then try again.');
      return false;
    }
  };
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };
  const beginAdd = () => { setActiveTransaction(null); setQuickEntryPrefill(null); setActiveModal('add'); };
  const beginEdit = (transaction: Transaction) => { setQuickEntryPrefill(null); setActiveTransaction(transaction); setActiveModal('edit'); };
  const saveTransaction = (values: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => {
    const now = new Date().toISOString();
    const updated: Transaction = id
      ? { ...values, id, createdAt: data.transactions.find((item) => item.id === id)?.createdAt ?? now, updatedAt: now }
      : { ...values, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    const transactions = id
      ? data.transactions.map((item) => item.id === id ? updated : item)
      : [updated, ...data.transactions];
    if (!updateData({ ...data, transactions: transactions.sort((a, b) => b.datetime.localeCompare(a.datetime)) })) return false;
    setActiveModal(null);
    setQuickEntryPrefill(null);
    notify(id ? 'Purchase updated' : 'Purchase saved');
    return true;
  };
  const deleteTransaction = () => {
    if (!activeTransaction) return false;
    if (!updateData({ ...data, transactions: data.transactions.filter((item) => item.id !== activeTransaction.id) })) return false;
    setActiveModal(null);
    setActiveTransaction(null);
    notify('Purchase removed');
    return true;
  };
  const clearAll = () => {
    if (!updateData({ ...data, transactions: [] })) return false;
    setActiveModal(null);
    notify('All purchases cleared');
    return true;
  };
  const exportAll = () => {
    const payload = JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
    downloadText(`tapledger-backup-${dayKey(new Date())}.json`, payload, 'application/json');
    notify('Your data export is ready');
  };

  return (
    <div className="app-shell">
      <Navigation onAdd={beginAdd} location={location} />
      <main className="content-wrap page-enter">
        <header className="topbar">
          <Link href="/" className="brand" data-testid="link-brand">
            <span className="brand-mark"><Receipt size={18} strokeWidth={2.1} /></span>
            <span className="brand-word">tapledger</span>
          </Link>
          <span className="date-label" data-testid="text-today-date">
            {new Intl.DateTimeFormat('en-MY', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
          </span>
        </header>
        <Switch>
          <Route path="/">
            <Dashboard data={data} onAdd={beginAdd} onEdit={beginEdit} onDelete={(item) => { setActiveTransaction(item); setActiveModal('delete'); }} />
          </Route>
          <Route path="/history">
            <History data={data} onEdit={beginEdit} onDelete={(item) => { setActiveTransaction(item); setActiveModal('delete'); }} />
          </Route>
          <Route path="/reports">
            <Reports data={data} onExport={() => {
              downloadText(`tapledger-transactions-${monthKey(new Date())}.csv`, exportCsv(data.transactions), 'text/csv;charset=utf-8');
              notify('CSV export downloaded');
            }} />
          </Route>
          <Route path="/settings">
            <SettingsPage data={data} onUpdate={updateData} onExport={exportAll} onClear={() => setActiveModal('clear')} notify={notify} />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </main>
      {toast && <div className="toast" role="status" data-testid="status-toast">{toast}</div>}
      {storageError && <div className="storage-error" role="alert" data-testid="error-storage">{storageError}</div>}
      {(activeModal === 'add' || activeModal === 'edit') && (
        <TransactionForm
          key={`${activeModal}-${activeTransaction?.id ?? 'new'}`}
          initial={activeModal === 'edit' ? activeTransaction : null}
          prefill={activeModal === 'add' ? quickEntryPrefill : null}
          defaultPaymentMethod={data.settings.defaultPaymentMethod}
          onClose={() => { setActiveModal(null); setQuickEntryPrefill(null); }}
          onSave={saveTransaction}
        />
      )}
      {activeModal === 'delete' && activeTransaction && (
        <ConfirmModal
          title="Remove this purchase?"
          description={`${activeTransaction.merchant} · RM ${currency(activeTransaction.amount)}. This cannot be undone.`}
          confirmLabel="Remove purchase"
          onClose={() => setActiveModal(null)}
          onConfirm={deleteTransaction}
        />
      )}
      {activeModal === 'clear' && (
        <ConfirmModal
          title="Clear all purchases?"
          description="This removes every transaction saved on this device. Your budget and payment preference will stay as they are."
          confirmLabel="Clear all purchases"
          onClose={() => setActiveModal(null)}
          onConfirm={clearAll}
        />
      )}
    </div>
  );
}

function Navigation({ onAdd, location }: { onAdd: () => void; location: string }) {
  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/history', label: 'History', icon: Receipt },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="nav-inner">
        {links.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase()}`}>
            <Icon size={19} /><span>{label}</span>
          </Link>
        ))}
        <button className="nav-add" onClick={onAdd} aria-label="Quick Add purchase" data-testid="button-quick-add">
          <Plus size={23} />
        </button>
        {links.slice(2).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase()}`}>
            <Icon size={19} /><span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function Dashboard({ data, onAdd, onEdit, onDelete }: {
  data: LedgerData; onAdd: () => void; onEdit: (item: Transaction) => void; onDelete: (item: Transaction) => void;
}) {
  const today = dayKey(new Date());
  const month = monthKey(new Date());
  const todayTransactions = data.transactions.filter((item) => dayKey(item.datetime) === today);
  const todayTotal = todayTransactions.reduce((sum, item) => sum + item.amount, 0);
  const monthTransactions = data.transactions.filter((item) => monthKey(item.datetime) === month);
  const monthTotal = monthTransactions.reduce((sum, item) => sum + item.amount, 0);
  const remaining = data.settings.monthlyBudget - monthTotal;
  const progress = data.settings.monthlyBudget > 0 ? Math.min(100, (monthTotal / data.settings.monthlyBudget) * 100) : 0;
  const categories = categoryTotals(monthTransactions);
  const recent = data.transactions.slice(0, 5);
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Your money, at a glance</p><h1>A little more in view.</h1></div>
        <button className="primary-btn" onClick={onAdd} data-testid="button-dashboard-add"><Plus size={17} /> Add a purchase</button>
      </div>
      <div className="dashboard-grid">
        <section className="hero-card" data-testid="card-spend-today">
          <div className="hero-top"><p className="eyebrow">Spent today</p><span className="pill">{new Intl.DateTimeFormat('en-MY', { month: 'long' }).format(new Date())}</span></div>
          <div className="hero-amount" data-testid="value-spend-today"><span>RM</span>{currency(todayTotal)}</div>
          <p className="hero-sub">{todayTotal === 0 ? 'A fresh page for today.' : `${todayTransactions.length} purchase${todayTransactions.length === 1 ? '' : 's'} captured today`}</p>
        </section>
        <section className="panel budget-panel" data-testid="card-monthly-budget">
          <div>
            <div className="budget-head"><p className="eyebrow" style={{ margin: 0 }}>This month</p><Wallet size={17} color="#58806b" /></div>
            <div className="budget-amount" data-testid="value-month-spend">RM {currency(monthTotal)}</div>
            <div className="progress-track" aria-label={`${Math.round(progress)}% of monthly budget used`}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="budget-meta">
            <span>{data.settings.monthlyBudget ? `${Math.round(progress)}% of RM ${currency(data.settings.monthlyBudget)} budget` : 'Set a monthly budget'}</span>
            <span className={remaining < 0 ? 'budget-over' : ''} data-testid="value-budget-remaining">{remaining < 0 ? 'Over by' : 'Left'} RM {currency(Math.abs(remaining))}</span>
          </div>
        </section>
        <section className="panel recent-panel">
          <div className="section-head"><h2>Recent purchases</h2><Link href="/history" className="text-link" data-testid="link-view-history">View all <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></Link></div>
          {recent.length ? <TransactionList transactions={recent} onEdit={onEdit} onDelete={onDelete} /> : (
            <EmptyState icon={<Receipt size={22} />} title="Your first purchase starts here" description="Capture a coffee, a ride, or anything worth keeping track of." action={<button className="secondary-btn blank-state-cta" onClick={onAdd} data-testid="button-empty-add"><Plus size={15} /> Add your first purchase</button>} />
          )}
        </section>
        <section className="panel">
          <div className="section-head"><h2>Where it goes</h2><span className="muted small">This month</span></div>
          {categories.length ? <CategoryBreakdown rows={categories.slice(0, 5)} total={monthTotal} /> : <EmptyState icon={<SlidersHorizontal size={21} />} title="Your categories will live here" description="Once you log a purchase, its category appears in this view." />}
        </section>
      </div>
    </>
  );
}

function History({ data, onEdit, onDelete }: { data: LedgerData; onEdit: (item: Transaction) => void; onDelete: (item: Transaction) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filtered = data.transactions.filter((item) => {
    const matchesQuery = `${item.merchant} ${item.notes ?? ''} ${item.category} ${item.paymentMethod}`.toLowerCase().includes(query.toLowerCase());
    const date = dayKey(item.datetime);
    return matchesQuery && (!category || item.category === category) && (!from || date >= from) && (!to || date <= to);
  });
  const groups = groupByDate(filtered);
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Every little thing, remembered</p><h1>Purchase history</h1></div><span className="muted small" data-testid="text-history-count">{filtered.length} {filtered.length === 1 ? 'purchase' : 'purchases'}</span></div>
      <section className="panel history-tools">
        <label className="field-group">
          <span className="field-label">Search purchases</span>
          <span style={{ position: 'relative' }}><Search size={17} style={{ position: 'absolute', left: 13, top: 13, color: '#859087' }} /><input className="search-field" style={{ paddingLeft: 39 }} type="search" placeholder="Merchant, notes, category..." value={query} onChange={(event) => setQuery(event.target.value)} data-testid="input-history-search" /></span>
        </label>
        <div className="filter-row">
          <label className="field-group"><span className="field-label">Category</span><select className="select-field" value={category} onChange={(event) => setCategory(event.target.value)} data-testid="select-history-category"><option value="">All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="field-group"><span className="field-label">From</span><input type="date" className="form-field" value={from} onChange={(event) => setFrom(event.target.value)} data-testid="input-history-from" /></label>
          <label className="field-group"><span className="field-label">To</span><input type="date" className="form-field" value={to} onChange={(event) => setTo(event.target.value)} data-testid="input-history-to" /></label>
          <button className="secondary-btn" style={{ alignSelf: 'end' }} onClick={() => { setQuery(''); setCategory(''); setFrom(''); setTo(''); }} data-testid="button-clear-filters"><X size={15} /> Clear filters</button>
        </div>
      </section>
      {filtered.length ? (
        <div style={{ display: 'grid', gap: 17 }}>
          {Array.from(groups.entries()).map(([date, items]) => (
            <section key={date}>
              <div className="section-head" style={{ padding: '0 3px', marginBottom: 8 }}><h3>{date}</h3><span className="muted small">RM {currency(items.reduce((sum, item) => sum + item.amount, 0))}</span></div>
              <div className="panel list-card"><TransactionList transactions={items} onEdit={onEdit} onDelete={onDelete} /></div>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel"><EmptyState icon={query || category || from || to ? <Search size={21} /> : <Receipt size={21} />} title={data.transactions.length ? 'No purchases match' : 'Nothing in your history yet'} description={data.transactions.length ? 'Try widening your dates or clearing a filter.' : 'When you add a purchase, it will be easy to find here.'} action={data.transactions.length && (query || category || from || to) ? <button className="text-link" onClick={() => { setQuery(''); setCategory(''); setFrom(''); setTo(''); }} data-testid="button-reset-empty-filters">Reset filters</button> : undefined} /></section>
      )}
    </>
  );
}

function Reports({ data, onExport }: { data: LedgerData; onExport: () => void }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (5 - index), 1));
  const monthly = months.map((date) => {
    const key = monthKey(date);
    return { date, key, total: data.transactions.filter((item) => monthKey(item.datetime) === key).reduce((sum, item) => sum + item.amount, 0) };
  });
  const max = Math.max(...monthly.map((item) => item.total), 1);
  const currentTotal = monthly[monthly.length - 1].total;
  const previousTotal = monthly[monthly.length - 2].total;
  const change = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;
  const categories = categoryTotals(data.transactions.filter((item) => monthKey(item.datetime) === monthKey(now)));
  const colors = categoryColors;
  const sum = categories.reduce((total, row) => total + row.total, 0);
  const gradient = categories.length
    ? `conic-gradient(${categories.map((item, index) => {
      const start = categories.slice(0, index).reduce((acc, row) => acc + row.total, 0) / sum * 100;
      const end = start + item.total / sum * 100;
      return `${colors[index % colors.length]} ${start}% ${end}%`;
    }).join(',')})`
    : '#eae6de';
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Patterns, not pressure</p><h1>Your spending story</h1></div><button className="secondary-btn" onClick={onExport} disabled={!data.transactions.length} data-testid="button-export-csv"><ArrowDownToLine size={16} /> Export CSV</button></div>
      <div className="report-grid">
        <section className="panel">
          <div className="section-head"><div><h2>Monthly rhythm</h2><p className="report-caption">Your last six months of spending</p></div><BarChart3 size={19} color="#5d806a" /></div>
          {data.transactions.length ? (
            <>
              <div className="trend-chart" data-testid="chart-monthly-trend">
                {monthly.map((item, index) => (
                  <div className={`trend-col ${index === monthly.length - 1 ? 'current' : ''}`} key={item.key} data-testid={`chart-month-${item.key}`}>
                    <span className="trend-value">{item.total ? (item.total >= 1000 ? `${(item.total / 1000).toFixed(1)}k` : Math.round(item.total)) : ''}</span>
                    <div className="trend-bar" style={{ height: `${Math.max(item.total ? 8 : 2, item.total / max * 112)}px` }} />
                    <span className="trend-label">{new Intl.DateTimeFormat('en-MY', { month: 'short' }).format(item.date)}</span>
                  </div>
                ))}
              </div>
              <p className="report-caption" style={{ marginTop: 27 }} data-testid="text-month-comparison">
                {change === null ? 'Add a previous month to see how your spending shifts.' : `${Math.abs(change).toFixed(1)}% ${change > 0 ? 'more' : change < 0 ? 'less' : 'unchanged'} than last month`}
              </p>
            </>
          ) : <EmptyState icon={<BarChart3 size={22} />} title="The story starts with one tap" description="Add a purchase and your monthly rhythm will take shape here." />}
        </section>
        <section className="panel">
          <div className="section-head"><div><h2>By category</h2><p className="report-caption">This month</p></div><ListFilter size={18} color="#5d806a" /></div>
          {categories.length ? (
            <div className="donut-wrap">
              <div className="donut" style={{ background: gradient }} data-testid="chart-category-breakdown"><div className="donut-center">RM<br />{currency(sum, 0)}</div></div>
              <div className="legend">{categories.slice(0, 5).map((item, index) => <div className="legend-row" key={item.category} data-testid={`legend-category-${index}`}><span className="legend-dot" style={{ background: colors[index % colors.length] }} /><span>{item.category}</span></div>)}</div>
            </div>
          ) : <EmptyState icon={<SlidersHorizontal size={21} />} title="No category mix yet" description="A little data makes this view useful. Add your first purchase to begin." />}
        </section>
        <section className="panel" style={{ gridColumn: '1/-1' }}>
          <div className="section-head"><div><h2>A few useful numbers</h2><p className="report-caption">A quick read on the current month</p></div><CalendarDays size={18} color="#5d806a" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(135px,1fr))', gap: 12 }}>
            <Metric label="This month" value={`RM ${currency(currentTotal)}`} testId="metric-current-month" />
            <Metric label="Purchases" value={String(data.transactions.filter((item) => monthKey(item.datetime) === monthKey(now)).length)} testId="metric-purchases" />
            <Metric label="Average purchase" value={`RM ${currency(data.transactions.filter((item) => monthKey(item.datetime) === monthKey(now)).length ? currentTotal / data.transactions.filter((item) => monthKey(item.datetime) === monthKey(now)).length : 0)}`} testId="metric-average" />
            <Metric label="Monthly budget" value={`RM ${currency(data.settings.monthlyBudget)}`} testId="metric-budget" />
          </div>
        </section>
      </div>
    </>
  );
}

function SettingsPage({ data, onUpdate, onExport, onClear, notify }: {
  data: LedgerData; onUpdate: (next: LedgerData) => boolean; onExport: () => void; onClear: () => void; notify: (message: string) => void;
}) {
  const [budgetText, setBudgetText] = useState(String(data.settings.monthlyBudget));
  const transactionCount = data.transactions.length;
  const saveBudget = () => {
    const amount = Number(budgetText);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      setBudgetText(String(data.settings.monthlyBudget));
      notify('Enter a budget between RM 0.01 and RM 1,000,000');
      return;
    }
    if (onUpdate({ ...data, settings: { ...data.settings, monthlyBudget: amount } })) notify('Monthly budget saved');
  };
  const changePayment = (method: PaymentMethod) => {
    if (onUpdate({ ...data, settings: { ...data.settings, defaultPaymentMethod: method } })) notify('Default payment method saved');
  };
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Set your own pace</p><h1>Settings</h1></div><span className="muted small" data-testid="text-data-device">Saved on this device</span></div>
      <div className="settings-stack">
        <section className="panel">
          <div className="section-head"><h2>Your monthly plan</h2><Wallet size={18} color="#5d806a" /></div>
          <div className="setting-row">
            <div className="setting-copy"><strong>Monthly spending budget</strong><span>A gentle reference for what you want to spend each month.</span></div>
            <div className="setting-control" style={{ display: 'flex', gap: 8 }}>
              <label style={{ position: 'relative', flex: 1 }}><span className="amount-prefix">RM</span><input className="form-field" style={{ paddingLeft: 42 }} type="number" min="0.01" max="1000000" step="0.01" value={budgetText} onChange={(event) => setBudgetText(event.target.value)} onBlur={saveBudget} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveBudget(); } }} aria-label="Monthly budget in Ringgit" data-testid="input-monthly-budget" /></label>
              <button className="icon-btn" onClick={saveBudget} aria-label="Save monthly budget" data-testid="button-save-budget"><Check size={17} /></button>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="section-head"><h2>Quick add preference</h2><CreditCard size={18} color="#5d806a" /></div>
          <div className="setting-row">
            <div className="setting-copy"><strong>Default payment method</strong><span>Preselected next time you add a purchase. You can always change it.</span></div>
            <select className="select-field setting-control" value={data.settings.defaultPaymentMethod} onChange={(event) => changePayment(event.target.value as PaymentMethod)} data-testid="select-default-payment">
              {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
            </select>
          </div>
        </section>
        <section className="panel">
          <div className="section-head"><h2>Your local data</h2><FileText size={18} color="#5d806a" /></div>
          <div className="setting-row">
            <div className="setting-copy"><strong data-testid="text-transaction-count">{transactionCount} saved {transactionCount === 1 ? 'purchase' : 'purchases'}</strong><span>Your information stays in this browser on this device.</span></div>
            <button className="secondary-btn setting-control" onClick={onExport} data-testid="button-export-data"><ArrowDownToLine size={16} /> Export all data</button>
          </div>
          <div className="notice"><CircleHelp size={16} /><span>TapLedger works offline after loading. Your data is stored locally; clearing browser data may remove it. An Apple Shortcut API is not connected.</span></div>
        </section>
        <section className="panel">
          <div className="setting-row">
            <div className="setting-copy"><strong>Start fresh</strong><span>Remove all saved purchases while keeping your settings.</span></div>
            <button className="danger-btn setting-control" onClick={onClear} disabled={!transactionCount} data-testid="button-clear-data"><Trash2 size={16} /> Clear purchases</button>
          </div>
        </section>
      </div>
    </>
  );
}

function TransactionForm({ initial, prefill, defaultPaymentMethod, onClose, onSave }: {
  initial: Transaction | null; defaultPaymentMethod: PaymentMethod; onClose: () => void;
  prefill: ExpenseReviewDraft | null;
  onSave: (values: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => boolean;
}) {
  const [merchant, setMerchant] = useState(initial?.merchant ?? prefill?.merchant ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : prefill?.amount ?? '');
  const suggestedInitialCategory = suggestCategory(initial?.merchant ?? prefill?.merchant ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? suggestedInitialCategory ?? 'Food & Beverage');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? prefill?.paymentMethod ?? defaultPaymentMethod);
  const [datetime, setDatetime] = useState(initial ? localDateTimeInput(initial.datetime) : localDateTimeInput());
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [categoryTouched, setCategoryTouched] = useState(Boolean(initial));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const recommended = suggestCategory(merchant);
  const handleMerchant = (value: string) => {
    setMerchant(value);
    if (!categoryTouched) setCategory(suggestCategory(value) ?? 'Other');
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    const parsedAmount = Number(amount);
    if (!merchant.trim()) { setError('Add a merchant or short description.'); return; }
    const roundedAmount = Math.round(parsedAmount * 100) / 100;
    if (!Number.isFinite(parsedAmount) || roundedAmount < 0.01 || parsedAmount > 1_000_000_000) { setError('Enter an amount of at least RM 0.01.'); return; }
    if (!datetime || Number.isNaN(new Date(datetime).getTime())) { setError('Choose a valid local date and time.'); return; }
    savingRef.current = true;
    setSaving(true);
    const saved = onSave({
      merchant: merchant.trim(),
      amount: roundedAmount,
      category,
      paymentMethod,
      datetime: new Date(datetime).toISOString(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }, initial?.id);
    if (!saved) {
      setError('Could not save on this device. Your purchase is still in this form; check available storage or browser settings and try again.');
      savingRef.current = false;
      setSaving(false);
    }
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-form-title">
        <div className="modal-handle" />
        <div className="modal-head"><div><p className="eyebrow" style={{ marginBottom: 5 }}>{initial ? 'Make a quick correction' : 'A little detail, then done'}</p><h2 id="transaction-form-title">{initial ? 'Edit purchase' : 'Quick add'}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close form" data-testid="button-close-transaction"><X size={17} /></button></div>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <label className="field-group wide"><span className="field-label">Merchant or description</span><input autoFocus className="form-field" value={merchant} onChange={(event) => handleMerchant(event.target.value)} placeholder="e.g. Kopi at the corner" maxLength={90} data-testid="input-transaction-merchant" /></label>
            <label className="field-group wide"><span className="field-label">Amount</span><div className="amount-wrap"><span className="amount-prefix">RM</span><input className="form-field amount-input" type="number" inputMode="decimal" min="0.01" max="1000000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" data-testid="input-transaction-amount" /></div></label>
            <label className="field-group"><span className="field-label">Category</span><select className="select-field" value={category} onChange={(event) => { setCategory(event.target.value as Category); setCategoryTouched(true); }} data-testid="select-transaction-category">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field-group"><span className="field-label">Payment method</span><select className="select-field" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} data-testid="select-transaction-payment">{PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field-group wide"><span className="field-label">Date and time · your local time</span><input className="form-field" type="datetime-local" value={datetime} onChange={(event) => setDatetime(event.target.value)} data-testid="input-transaction-datetime" /></label>
            <label className="field-group wide"><span className="field-label">Note <span className="muted" style={{ fontWeight: 400 }}>· optional</span></span><textarea className="form-field" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything to remember?" maxLength={240} data-testid="input-transaction-notes" /></label>
          </div>
          {prefill && <div className="notice" role="status" data-testid="status-quick-entry-review"><Check size={15} /><span>{prefill.invalidFields.length ? `Some URL details could not be used (${prefill.invalidFields.join(', ')}). Review and complete the fields before saving.` : 'Review these details before saving. Nothing has been added yet.'}</span></div>}
          {recommended && !categoryTouched && <div className="notice"><Check size={15} /><span>Suggested category: <strong>{recommended}</strong>. You can change it above.</span></div>}
          {error && <div className="form-error" role="alert" data-testid="error-transaction-form">{error}</div>}
          <div className="modal-actions"><button className="secondary-btn" type="button" onClick={onClose} data-testid="button-cancel-transaction">Cancel</button><button className="primary-btn" type="submit" disabled={saving} data-testid="button-save-transaction">{saving ? 'Saving…' : initial ? 'Save changes' : 'Save purchase'} <ArrowRight size={15} /></button></div>
        </form>
      </section>
    </div>
  );
}

function ConfirmModal({ title, description, confirmLabel, onClose, onConfirm }: {
  title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => boolean;
}) {
  const [busy, setBusy] = useState(false);
  const confirm = () => { if (busy) return; setBusy(true); if (onConfirm() === false) setBusy(false); };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="modal-handle" /><div className="modal-head"><h2 id="confirm-title">{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close confirmation" data-testid="button-close-confirm"><X size={17} /></button></div>
        <p className="confirm-copy">{description}</p>
        <div className="modal-actions"><button className="secondary-btn" onClick={onClose} data-testid="button-cancel-confirm">Keep it</button><button className="danger-btn" onClick={confirm} disabled={busy} data-testid="button-confirm-delete">{confirmLabel}</button></div>
      </section>
    </div>
  );
}

function TransactionList({ transactions, onEdit, onDelete }: {
  transactions: Transaction[]; onEdit: (item: Transaction) => void; onDelete: (item: Transaction) => void;
}) {
  return <div className="transaction-list">{transactions.map((item) => (
    <article className="transaction-row" key={item.id} data-testid={`row-transaction-${item.id}`}>
      <div className="transaction-icon"><CategoryIcon category={item.category} /></div>
      <div className="transaction-main"><div className="transaction-title" data-testid={`text-merchant-${item.id}`}>{item.merchant}</div><div className="transaction-meta">{item.category} · {item.paymentMethod} · {formatDateTime(item.datetime)}{item.notes ? ` · ${item.notes}` : ''}</div></div>
      <div className="transaction-value" data-testid={`value-transaction-${item.id}`}>− RM {currency(item.amount)}</div>
      <div className="row-actions"><button aria-label={`Edit ${item.merchant}`} onClick={() => onEdit(item)} data-testid={`button-edit-${item.id}`}><Pencil size={15} /></button><button aria-label={`Delete ${item.merchant}`} onClick={() => onDelete(item)} data-testid={`button-delete-${item.id}`}><Trash2 size={15} /></button></div>
    </article>
  ))}</div>;
}

function CategoryIcon({ category }: { category: Category }) {
  const Icon = category === 'Food & Beverage' ? Coffee : category === 'Transport' ? CarFront : category === 'Groceries' ? ShoppingBag : category === 'Personal Care' ? MoreHorizontal : Receipt;
  return <Icon size={18} strokeWidth={1.8} />;
}

function CategoryBreakdown({ rows, total }: { rows: { category: Category; total: number }[]; total: number }) {
  return <div className="category-list">{rows.map((row, index) => (
    <div key={row.category} className="category-item" data-testid={`category-row-${index}`}>
      <div><div className="category-label"><span>{row.category}</span><span>RM {currency(row.total)}</span></div><div className="category-track"><div className="category-bar" style={{ width: `${Math.max(5, row.total / Math.max(total, 1) * 100)}%`, background: categoryColors[index % categoryColors.length] }} /></div></div>
    </div>
  ))}</div>;
}

function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{description}</p>{action}</div>;
}

function Metric({ label, value, testId }: { label: string; value: string; testId: string }) {
  return <div style={{ background: '#f5f2e9', borderRadius: 16, padding: 15 }}><div className="muted small">{label}</div><strong style={{ display: 'block', marginTop: 9, font: '700 17px var(--app-font-display)' }} data-testid={testId}>{value}</strong></div>;
}

function NotFound() {
  return <section className="panel"><EmptyState icon={<FileText size={21} />} title="That page isn't here" description="Head back to your spending overview." action={<Link href="/" className="primary-btn blank-state-cta" data-testid="link-not-found-home"><ArrowLeft size={15} /> Go to overview</Link>} /></section>;
}

function categoryTotals(transactions: Transaction[]) {
  const values = new Map<Category, number>();
  transactions.forEach((item) => values.set(item.category, (values.get(item.category) ?? 0) + item.amount));
  return Array.from(values, ([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

function groupByDate(transactions: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  transactions.forEach((item) => {
    const key = dayKey(item.datetime);
    const date = new Date(item.datetime);
    const label = key === dayKey(new Date()) ? 'Today' : key === dayKey(new Date(Date.now() - 86_400_000)) ? 'Yesterday' : new Intl.DateTimeFormat('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  });
  return groups;
}

export default App;
