// Shared by the authenticated adapter and the statistics view. Store amounts
// as integer cents while aggregating, including every level of the category tree.
export function monthKey(value = new Date()) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('月份无效');
  const [year, number] = month.split('-').map(Number);
  return {
    start: new Date(year, number - 1, 1).toISOString(),
    end: new Date(year, number, 1).toISOString(),
  };
}

export function shiftMonth(month, offset) {
  const [year, number] = month.split('-').map(Number);
  return monthKey(new Date(year, number - 1 + offset, 1));
}

export function changedExpenseMonths(previous, next) {
  const index = rows => new Map(rows.map((row, i) => [String(row.id ?? `local:${i}`), row]));
  const before = index(previous), after = index(next), months = new Set();
  // Compare effective ledger values, not outbox metadata. A successful upload
  // of an unchanged local edit must not cause another historical download.
  const signature = row => row && JSON.stringify([
    Number(row.amount),
    Array.isArray(row.category) && row.category.length ? row.category : String(row.purpose || '').split(/[\/\s,，]+/).filter(Boolean),
    monthKey(row.time),
  ]);
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const oldRow = before.get(id), newRow = after.get(id);
    if (signature(oldRow) === signature(newRow)) continue;
    for (const row of [oldRow, newRow]) {
      const month = row && monthKey(row.time);
      if (month) months.add(month);
    }
  }
  return [...months];
}

export function summarizeExpenseMonth(records, month, pending = []) {
  const rows = new Map(records.map((row, index) => [row.id == null ? `local:${index}` : String(row.id), row]));
  for (const operation of pending) {
    if (operation.operation === 'delete') rows.delete(String(operation.id));
    else rows.set(String(operation.id), operation);
  }
  const roots = new Map();
  let total = 0, count = 0;
  for (const row of rows.values()) {
    const amount = Number(row.amount);
    if (monthKey(row.time) !== month || !Number.isFinite(amount) || amount <= 0) continue;
    const cents = Math.round(amount * 100);
    const path = (Array.isArray(row.category) && row.category.length
      ? row.category : String(row.purpose || '').split(/[\/\s,，]+/))
      .map(name => String(name || '').trim()).filter(Boolean).slice(0, 3);
    if (!path.length) path.push('未分类');
    total += cents; count++;
    let siblings = roots;
    for (const name of path) {
      if (!siblings.has(name)) siblings.set(name, { name, cents: 0, children: new Map() });
      const node = siblings.get(name);
      node.cents += cents;
      siblings = node.children;
    }
  }
  const clean = nodes => [...nodes.values()].map(node => ({
    name: node.name, value: node.cents / 100,
    ...(node.children.size ? { children: clean(node.children) } : {}),
  }));
  return { month, total: total / 100, count, data: clean(roots) };
}

export async function fetchAllExpenseRecords(client, userId) {
  const records = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('money')
      .select('id, amount, category, time').eq('type', 'expense').eq('user_id', userId)
      .order('time', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 499);
    if (error) throw error;
    if (!Array.isArray(data)) throw Error('消费记录返回格式有误');
    records.push(...data);
    if (data.length < 500) break;
  }
  return records;
}

export function summarizeExpenseMonths(records, pending = []) {
  const current = monthKey();
  const months = [...records, ...pending].map(row => monthKey(row.time)).filter(month => month && month <= current).sort();
  const first = months[0] || current;
  const summaries = [];
  for (let month = first; month <= current; month = shiftMonth(month, 1)) {
    summaries.push({ ...summarizeExpenseMonth(records, month, pending), firstMonth: first });
  }
  return summaries;
}

// Summary-only cache: no duplicate cloud ledger, account + calendar timezone
// isolation and bounded storage. Cached months never expire with elapsed time.
export class MonthStatsCache {
  constructor(owner, storage = localStorage) {
    this.storage = storage;
    this.key = `water-month-stats:v1:${owner || 'guest'}:${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
    try { this.entries = JSON.parse(storage.getItem(this.key) || '{}'); } catch { this.entries = {}; }
    if (!this.entries || Array.isArray(this.entries) || typeof this.entries !== 'object') this.entries = {};
    this.entries = Object.fromEntries(Object.entries(this.entries).filter(([month, entry]) =>
      /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && entry && Array.isArray(entry.summary?.data)
      && entry.summary.month === month && Number.isFinite(entry.summary.total)));
    try { this.complete = Boolean(JSON.parse(storage.getItem(this.key + ':synced') || 'null')?.completedAt); } catch { this.complete = false; }
    if (!Object.keys(this.entries).length) this.complete = false;
  }
  get(month) {
    const entry = this.entries[month];
    return entry && Array.isArray(entry.summary?.data) && Number.isFinite(entry.summary.total) ? entry : null;
  }
  put(month, summary, pendingSignature = '') {
    this.entries[month] = { summary, pendingSignature, updatedAt: Date.now() };
    try { this.storage.setItem(this.key, JSON.stringify(this.entries)); } catch { /* Keep the in-memory cache. */ }
  }
  replace(summaries) {
    this.entries = Object.fromEntries(summaries.map(summary => [summary.month, { summary, updatedAt: Date.now() }]));
    this.complete = true;
    try {
      this.storage.setItem(this.key, JSON.stringify(this.entries));
      this.storage.setItem(this.key + ':synced', JSON.stringify({ completedAt: Date.now() }));
    } catch { /* Keep the complete in-memory snapshot if storage is unavailable. */ }
  }
  invalidate(months = Object.keys(this.entries)) {
    for (const month of months) if (this.entries[month]) this.entries[month].updatedAt = 0;
    try { this.storage.setItem(this.key, JSON.stringify(this.entries)); } catch {}
  }
}
