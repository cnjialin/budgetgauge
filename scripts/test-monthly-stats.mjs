import assert from 'node:assert/strict';
import { monthKey, monthRange, shiftMonth, summarizeExpenseMonth, summarizeExpenseMonths, MonthStatsCache, changedExpenseMonths } from '../monthly-stats.js';

assert.equal(shiftMonth('2026-01', -1), '2025-12');
assert.equal(shiftMonth('2025-12', 1), '2026-01');
assert.throws(() => monthRange('2026-13'));
assert.equal(monthKey('invalid'), '');
const rows = [
  { id: 1, amount: .1, category: ['餐饮', '早餐'], time: '2024-02-01T08:00:00' },
  { id: 2, amount: .2, purpose: '餐饮 / 早餐', time: '2024-02-29T08:00:00' },
  { id: 3, amount: 99, category: ['购物'], time: '2024-03-01T00:00:00' },
  { id: 4, amount: 1, time: '2024-02-15T00:00:00' },
];
const original = summarizeExpenseMonth(rows, '2024-02');
assert.equal(original.total, 1.3);
assert.equal(original.data[0].children[0].value, .3);
const changed = summarizeExpenseMonth(rows, '2024-02', [
  { id: 1, operation: 'update', amount: 10, category: ['交通'], time: '2024-03-01T00:00:00' },
  { id: 2, operation: 'delete' },
  { id: -1, operation: 'save', amount: 2, category: ['交通'], time: '2024-02-29T12:00:00' },
]);
assert.equal(changed.total, 3);
assert.equal(changed.count, 2);
assert.equal(changed.data[0].name, '未分类');
const memory = new Map();
const storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) };
const cache = new MonthStatsCache('project|account-a', storage);
cache.put('2024-02', original);
assert.equal(new MonthStatsCache('project|account-a', storage).get('2024-02').summary.total, 1.3);
assert.equal(new MonthStatsCache('project|account-b', storage).get('2024-02'), null);
assert.equal(cache.complete, false);
cache.replace([original]);
assert.equal(new MonthStatsCache('project|account-a', storage).complete, true);
const allMonths = summarizeExpenseMonths(rows);
assert.equal(allMonths.find(summary => summary.month === '2024-02').total, 1.3);
assert.equal(allMonths.find(summary => summary.month === '2024-04').total, 0);
cache.invalidate();
assert.equal(cache.get('2024-02').updatedAt, 0);
assert.equal(cache.get('2024-02').summary.total, 1.3);
cache.put('2024-02', original);
cache.invalidate(['2024-03']);
assert(cache.get('2024-02').updatedAt > 0, 'An unrelated month keeps its cache');
assert.deepEqual(changedExpenseMonths(rows, rows.map(row => ({ ...row, operationId: 'acknowledged' }))), []);
assert.deepEqual(changedExpenseMonths(rows, rows.map(row => row.id === 1 ? { ...row, time: '2024-03-01T00:00:00' } : row)).sort(), ['2024-02', '2024-03']);
const broken = new MonthStatsCache('broken', { getItem: () => 'null', setItem: () => { throw Error('quota'); } });
broken.put('2024-02', original);
assert.equal(broken.get('2024-02').summary.total, 1.3);
console.log('PASS calendar boundaries, nested categories, cents, pending mutations, persisted and isolated caches');
