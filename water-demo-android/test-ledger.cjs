const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const user={id:'00000000-0000-4000-8000-000000000001',email:'ledger@example.com',aud:'authenticated',role:'authenticated'};
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'},'signature'].map((x,i)=>i===2?x:Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  const rows=Array.from({length:501},(_,i)=>({id:i+1,amount:'1.00',type:'expense',category:['餐饮'],time:new Date().toISOString(),user_id:user.id}));
  let writes=0,reads=0,failWrite=false,failRead=false,lastPayload,loseResponse=false;
  let readGate=null,releaseRead,userChecks=0;
  await page.route('https://test-project.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,GET,OPTIONS'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(url.pathname.includes('/token'))return route.fulfill({status:200,headers,json:{access_token:jwt,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user}});
   if(url.pathname.includes('/user')){userChecks++;return route.fulfill({status:200,headers,json:user});}
   if(url.pathname==='/rest/v1/money') {
    assert(req.headers().authorization.includes(jwt));
    if(['PATCH','DELETE'].includes(req.method())) {
     assert.equal(url.searchParams.get('user_id'),'eq.'+user.id);
     if(failWrite)return route.fulfill({status:403,headers,json:{message:'test mutation denied',code:'42501'}});
     const index=rows.findIndex(r=>String(r.id)===url.searchParams.get('id').slice(3));assert(index>=0);
     const record=req.method()==='PATCH'?Object.assign(rows[index],req.postDataJSON()):rows.splice(index,1)[0];
     return route.fulfill({status:200,headers,json:record});
    }
    if(req.method()==='POST') {
     writes++;lastPayload=req.postDataJSON();
     assert.equal(lastPayload.user_id,user.id);assert.equal(lastPayload.type,'expense');assert(!('purpose' in lastPayload));
     if(failWrite)return route.fulfill({status:403,headers,json:{message:'test write denied',code:'42501'}});
     await new Promise(r=>setTimeout(r,200));
     const saved={...lastPayload};rows.unshift(saved);
     if(loseResponse){loseResponse=false;return route.abort('failed');}
     return route.fulfill({status:201,headers,json:saved});
    }
    if(url.searchParams.has('id'))return route.fulfill({status:200,headers,json:rows.filter(r=>String(r.id)===url.searchParams.get('id').slice(3))});
    reads++;
    if(readGate)await readGate;
    assert.equal(url.searchParams.get('user_id'),'eq.'+user.id);assert.equal(url.searchParams.get('type'),'eq.expense');
    assert(url.searchParams.getAll('time').some(x=>x.startsWith('gte.')));assert(url.searchParams.getAll('time').some(x=>x.startsWith('lt.')));
    if(failRead)return route.fulfill({status:403,headers,json:{message:'test read denied',code:'42501'}});
    const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit'));
    return route.fulfill({status:200,headers,json:rows.slice(offset,offset+limit)});
   }
   return route.fulfill({status:204,headers});
  });
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.evaluate(()=>localStorage.setItem('water-demo-records',JSON.stringify([{amount:9,time:new Date().toISOString()}])));
  await page.reload();await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});
  await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥9.00');
  const login=async()=>{await page.locator('#water').focus();await page.keyboard.press('ArrowDown');await page.waitForTimeout(650);};
  await login();await page.locator('#loginEmail').fill(user.email);await page.locator('#loginPassword').fill('synthetic-password');
  await page.locator('#loginConnection summary').click();await page.locator('#loginUrl').fill('https://test-project.supabase.co');await page.locator('#loginKey').fill('sb_publishable_test');await page.locator('#loginSubmit').click();
  await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥501.00');assert.equal(reads,2,'Must paginate');
  await page.evaluate(()=>window.waterBack());await page.waitForTimeout(650);
  await page.locator('#water').click({position:{x:195,y:280}});
  const frame=page.frameLocator('#recordFrame');await frame.locator('#waterKeypad').waitFor({state:'visible'});
  for(const key of ['2','8','.','5'])await frame.locator(`[data-amount-key="${key}"]`).click();
  await frame.locator('#quickExpenseContinueBtn').click();
  failWrite=true;await frame.locator('#confirmExpenseBtn').click();
  await page.locator('#recordFrame').waitFor({state:'hidden'});
  assert.equal(writes,0,'Animation must start before upload');
  await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥529.50');
  await page.waitForFunction(()=>document.querySelector('#ledgerStatus').textContent.includes('test write denied'));
  assert.equal(lastPayload.amount,28.5);assert.equal(writes,1);
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('water-demo-records'))).length,1,'Cloud records must not pollute guest records');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥529.50');
  assert.equal(rows.length,501,'Failed uploads stay local across reload');
  failWrite=false;loseResponse=true;await login();await page.locator('#ledgerRefresh').click();
  await page.waitForFunction(()=>document.querySelector('#ledgerStatus').textContent.includes('等待同步'));
  const beforeRetry=writes;
  await page.locator('#ledgerRefresh').click();await page.locator('#ledgerStatus').filter({hasText:'本月消费已同步'}).waitFor();
  assert.equal(writes,beforeRetry,'Lost response retry must reuse existing record');assert.equal(rows.length,502);
  assert.equal(await page.locator('#monthAmount').textContent(),'¥529.50');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥529.50');
  await login();failRead=true;await page.locator('#ledgerRefresh').click();await page.locator('#ledgerStatus').filter({hasText:'test read denied'}).waitFor();
  assert.equal(await page.locator('#monthAmount').textContent(),'¥529.50','Read failure must preserve loaded data');
  failRead=false;await page.locator('#ledgerRefresh').click();await page.locator('#ledgerStatus').filter({hasText:'本月消费已同步'}).waitFor();
  const side=page.frames().find(f=>f.name()==='water-page-preview'),id=rows.find(r=>r.amount===28.5).id;
  const mutate=async(action,record)=>side.evaluate(({action,record})=>parent.postMessage({channel:'water-editor',action,record},'*'),{action,record});
  failWrite=true;await mutate('page-update',{id,amount:30,category:['餐饮'],time:new Date().toISOString()});
  await page.frameLocator('#sideFrame').locator('#browseStatus').filter({hasText:'test mutation denied'}).waitFor({state:'attached'});
  await page.waitForFunction(()=>document.querySelector('#sideFrame').contentDocument.querySelector('#browseStatus').textContent.includes('test mutation denied'));
  assert.equal(await page.locator('#monthAmount').textContent(),'¥529.50');
  failWrite=false;await mutate('page-update',{id,amount:30,category:['餐饮'],time:new Date().toISOString()});
  await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥531.00');
  await mutate('page-delete',{id});await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥501.00');
  readGate=new Promise(resolve=>{releaseRead=resolve;});
  const readsBefore=reads;
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥501.00');
  await page.locator('#water').click({position:{x:195,y:280}});
  await frame.locator('#waterKeypad').waitFor({state:'visible'});
  await frame.locator('[data-amount-key="1"]').click();
  await frame.locator('#quickExpenseContinueBtn').click();await frame.locator('#confirmExpenseBtn').click();
  await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥502.00');
  const cache=await page.evaluate(()=>JSON.parse(localStorage.getItem('water-ledger:https://test-project.supabase.co|00000000-0000-4000-8000-000000000001')));
  assert.equal(cache.pending.length,1,'Startup must allow durable recording while cloud read is blocked');
  assert.equal(reads,readsBefore+1,'Only one cloud read may be in flight');
  readGate=null;releaseRead();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('water-ledger:https://test-project.supabase.co|00000000-0000-4000-8000-000000000001')).pending.length===0);
  assert.equal(userChecks,0,'Restoring and syncing must not add /user network round trips');
  const resumeReads=reads;
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction(()=>document.querySelector('#ledgerStatus').textContent==='本月消费已同步');
  assert(reads>resumeReads,'Returning to app refreshes cloud records');
  await login();
  await page.locator('#loginLogout').click();await page.waitForFunction(()=>document.querySelector('#monthAmount').textContent==='¥9.00');
  assert.deepEqual(errors,[]);console.log('PASS pagination, account filter, immediate animation, durable outbox, lost-response deduplication, reload, read retry, guest isolation');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
