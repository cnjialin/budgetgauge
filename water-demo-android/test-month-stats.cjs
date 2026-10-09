const { chromium } = require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const now = new Date(), date = offset => new Date(now.getFullYear(), now.getMonth() + offset, 15, 12).toISOString();
    const label = offset => { const d = new Date(date(offset)); return `${d.getFullYear()}年${d.getMonth() + 1}月`; };
    const user = { id: '00000000-0000-4000-8000-000000000001', email: 'stats@example.com', aud: 'authenticated', role: 'authenticated' };
    const jwt = [{ alg: 'HS256', typ: 'JWT' }, { sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' }, 'signature'].map((x, i) => i === 2 ? x : Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
    const rows = [{ id: 1, amount: 9, category: ['餐饮'], time: date(0), user_id: user.id },
      ...Array.from({ length: 501 }, (_, i) => ({ id: i + 2, amount: 1, category: ['餐饮', '早餐'], time: date(-1), user_id: user.id })),
      { id: 999, amount: 70, category: ['交通'], time: date(-3), user_id: user.id }];
    let allReads = 0, offline = false;
    await page.route('https://stats-project.supabase.co/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (url.pathname.includes('/token')) return route.fulfill({ headers, json: { access_token: jwt, refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user } });
      if (url.pathname.includes('/user')) return route.fulfill({ headers, json: user });
      if (url.pathname === '/rest/v1/money') {
        if (request.method() === 'PATCH') return route.fulfill({ status: 403, headers, json: { message: 'test offline edit', code: '42501' } });
        assert.equal(url.searchParams.get('user_id'), `eq.${user.id}`); assert.equal(url.searchParams.get('type'), 'eq.expense');
        const times = url.searchParams.getAll('time'); if (!times.length) allReads++;
        if (offline) return route.fulfill({ status: 503, headers, json: { message: 'offline' } });
        let selected = rows;
        if (times.length) {
          const start = new Date(times.find(x => x.startsWith('gte.')).slice(4)), end = new Date(times.find(x => x.startsWith('lt.')).slice(3));
          selected = rows.filter(row => new Date(row.time) >= start && new Date(row.time) < end);
        }
        const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit'));
        return route.fulfill({ headers, json: selected.slice(offset, offset + limit) });
      }
      return route.fulfill({ status: 204, headers });
    });
    await page.goto('file:///E:/codex/outputs/water-demo.html');
    await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({ state: 'attached' });
    const login = async () => { await page.locator('#water').focus(); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(650); };
    const home = async () => { await page.evaluate(() => window.waterBack()); await page.waitForTimeout(650); };
    await login(); await page.locator('#loginEmail').fill(user.email); await page.locator('#loginPassword').fill('synthetic-password');
    await page.locator('#loginConnection').evaluate(el => { el.open = true; });
    await page.locator('#loginUrl').fill('https://stats-project.supabase.co'); await page.locator('#loginKey').fill('sb_publishable_test');
    await page.locator('#loginForm').evaluate(el => el.requestSubmit());
    const hasTotal = total => page.waitForFunction(value => Object.keys(localStorage).some(key => key.startsWith('water-month-stats:v1:') && localStorage.getItem(key).includes(`"total":${value}`)), total);
    await hasTotal(501);
    assert.equal(allReads, 2, 'Startup paginates all history before opening statistics');
    assert.equal(await page.locator('#sidePage').getAttribute('aria-hidden'), 'true');
    const readsAfterStartup = allReads; await home();
    const openStats = async () => { await page.locator('#water').focus(); await page.keyboard.press('ArrowLeft'); await page.frameLocator('#sideFrame').locator('#statsModal').waitFor({ state: 'visible' }); await page.waitForTimeout(650); };
    await openStats(); let side = page.frames().find(frame => frame.name() === 'water-page-preview');
    const key = async value => { await side.locator('#statsModalTitle').evaluate(el => { el.tabIndex = -1; el.focus(); }); await page.keyboard.press(value); };
    const expectMonth = async offset => assert.equal(await side.locator('#statsMonthLabel').textContent(), label(offset));
    await expectMonth(0); assert(await side.locator('#statsMonthStatus').isHidden());
    const initial = await side.locator('#expenseSunburstChart').boundingBox(); assert(Math.abs(initial.y + initial.height / 2 - 422) < 2);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 650 }] });
    for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 650 - step * 14 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await expectMonth(-1);
    for (let frame = 0; frame < 18; frame++) {
      const bounds = await side.locator('#expenseSunburstChart').boundingBox();
      assert(Math.abs(bounds.y + bounds.height / 2 - 422) < 2, 'Month transitions must keep the chart center fixed');
      const transforms = await side.locator('#expenseSunburstChart').evaluate(el => el.getAnimations().flatMap(animation => animation.effect.getKeyframes().map(key => key.transform).filter(Boolean)));
      assert.equal(transforms.length, 0, 'Month transitions must never translate the chart');
      assert.equal(await side.locator('#expenseSunburstChart').evaluate(el => getComputedStyle(el).opacity), '1', 'Month transitions must not abruptly dim the whole chart');
      await page.waitForTimeout(16);
    }
    await key('ArrowUp'); await expectMonth(-2); assert(await side.locator('#statsEmptyState').isVisible());
    await key('ArrowUp'); await expectMonth(-3); await key('ArrowUp'); await expectMonth(-3); await page.waitForTimeout(1000);
    assert.equal(allReads, readsAfterStartup, 'Viewing and swiping never trigger cloud reads');
    rows.find(row => row.id === 999).amount = 90; assert.equal(allReads, readsAfterStartup);
    await home(); await login(); await page.locator('#ledgerRefresh').click();
    await hasTotal(90);
    assert.equal(allReads, readsAfterStartup + 2, 'Existing refresh button updates all months');
    assert.equal(await page.locator('#monthAmount').textContent(), '¥9.00');
    await home(); await openStats(); side = page.frames().find(frame => frame.name() === 'water-page-preview');
    await key('ArrowUp'); await key('ArrowUp'); await key('ArrowUp'); await expectMonth(-3);
    await side.evaluate(() => document.activeElement?.blur()); await page.waitForTimeout(1000); await page.screenshot({ path: 'water-demo-android/build/ui-check/history-month-stats.png' });
    const readsBeforeReload = allReads; offline = true; await page.reload(); await page.waitForTimeout(900); await openStats();
    side = page.frames().find(frame => frame.name() === 'water-page-preview'); await key('ArrowUp'); await expectMonth(-1); await page.waitForTimeout(200);
    assert.equal(allReads, readsBeforeReload, 'Reopening a cached account does not fetch history'); assert(await side.locator('#expenseSunburstChart').isVisible());
    offline = false;
    await side.evaluate(record => parent.postMessage({ channel: 'water-editor', action: 'page-update', record }, '*'), { id: 1, amount: 12, category: ['交通'], time: date(-1) });
    await page.waitForFunction(() => document.querySelector('#monthAmount').textContent === '¥0.00'); assert.equal(allReads, readsBeforeReload);
    await home(); await login(); await page.locator('#ledgerRefresh').click(); await hasTotal(513);
    assert.deepEqual(errors, []); console.log('PASS startup preload, pagination, local-only swipes, manual refresh, offline restart and pending edits');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
