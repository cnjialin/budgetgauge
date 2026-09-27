const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  for(const [width,height] of [[390,844],[360,640],[320,568]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const cdp=await page.context().newCDPSession(page);
   const touchSwipe=async(x,y,dx,dy)=>{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   };
   await page.goto('file:///E:/codex/outputs/water-demo.html');
   await page.evaluate(()=>localStorage.setItem('water-demo-records',JSON.stringify([
    {id:101,amount:28.5,category:['餐饮','餐馆'],time:new Date().toISOString()},
    {id:102,amount:70,category:['虎牙','吃'],time:new Date().toISOString()},
   ])));
   await page.reload();const frame=page.frameLocator('#sideFrame');await frame.locator('#remainingBudget').waitFor({state:'attached'});
   await page.mouse.move(width*.2,height*.55);await page.mouse.down();await page.mouse.move(width*.55,height*.55,{steps:12});
   await frame.locator('#historyModal').waitFor({state:'visible'});
   await frame.locator('#historyMonthList').evaluate(el=>{
    window.historyMutations=0;window.historyObserver=new MutationObserver(()=>window.historyMutations++);
    window.historyObserver.observe(el,{childList:true,subtree:true});
   });
   await page.evaluate(()=>{
    const rows=JSON.parse(localStorage.getItem('water-demo-records'));rows[0].purpose='transition-check';
    localStorage.setItem('water-demo-records',JSON.stringify(rows));dispatchEvent(new Event('focus'));
   });
   await page.waitForTimeout(150);
   assert.equal(await frame.locator('#historyMonthList').evaluate(()=>window.historyMutations),0,'History DOM must stay stable while the circle expands');
   await page.mouse.up();
   await frame.locator('#historyModal').waitFor({state:'visible'});await page.waitForTimeout(650);
   assert(await frame.locator('#historyMonthList').evaluate(()=>window.historyMutations>0),'Deferred data must render after entry');
   assert.equal(await frame.locator('#historyModalTitle').textContent(),'历史消费');
   assert(await frame.locator('.history-filter').isHidden());
   assert((await frame.locator('#historyMonthList').innerText()).includes('98.50'));
   await frame.locator('#historyMonthList .history-item-month').first().click();await page.waitForTimeout(350);
   assert((await frame.locator('#historyMonthList').innerText()).includes('餐馆'));
   await page.screenshot({path:`water-demo-android/build/ui-check/browse-history-${width}.png`});
   await frame.locator('#historyMonthList .history-edit-btn').first().click();
   await frame.locator('#expenseAmountInput').click();
   await frame.locator('[data-amount-key="backspace"]').click();
   await frame.locator('#quickExpenseContinueBtn').click();
   await frame.locator('#confirmExpenseBtn').click();
   await frame.locator('#historyModal').waitFor({state:'visible'});
   await page.waitForTimeout(100);
   const values=await page.evaluate(()=>JSON.parse(localStorage.getItem('water-demo-records')).map(r=>r.amount));
   assert.notDeepEqual(values,[28.5,70]);
   await touchSwipe(width*.7,height*.8,-44,12);await page.waitForTimeout(650);
   assert.equal(await page.locator('#sidePage').getAttribute('aria-hidden'),'true','History must return with left swipe away from edges');
   await page.mouse.move(width*.8,height*.55);await page.mouse.down();await page.mouse.move(width*.4,height*.55,{steps:12});
   await frame.locator('#statsModal').waitFor({state:'visible'});
   assert.equal(await page.locator('#sidePage > h2, #sidePage > p').count(),0,'Old placeholder must be removed');
   assert.equal(await page.locator('#sideFrame').evaluate(e=>getComputedStyle(e).visibility),'visible','Actual page must be ready during expansion');
   assert.equal(await frame.locator('#expenseSunburstChart').evaluate(e=>getComputedStyle(e).visibility),'hidden','Ring animation waits until entry completes');
   await page.mouse.up();
   await frame.locator('#statsModal').waitFor({state:'visible'});await frame.locator('#expenseSunburstChart canvas').waitFor({state:'visible'});
   assert.equal(await frame.locator('#statsModalTitle').textContent(),'消费统计');await page.waitForTimeout(1200);
   const box=await frame.locator('#expenseSunburstChart').boundingBox();assert(box.width>200&&box.height>200);
   await page.screenshot({path:`water-demo-android/build/ui-check/browse-stats-${width}.png`});
   await page.mouse.move(width*.3,height*.8);await page.mouse.down();await page.mouse.move(width*.7,height*.8,{steps:12});await page.mouse.up();await page.waitForTimeout(650);
   assert.equal(await page.locator('#sidePage').getAttribute('aria-hidden'),'true');
   await page.evaluate(()=>{
    const rows=JSON.parse(localStorage.getItem('water-demo-records'));
    for(let i=0;i<60;i++)rows.push({id:200+i,amount:1,category:['交通','公共交通'],time:new Date().toISOString()});
    localStorage.setItem('water-demo-records',JSON.stringify(rows));dispatchEvent(new Event('focus'));
   });
   await page.locator('#water').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(650);
   const layout=await frame.locator('#historyModal').evaluate(modal=>{
    return {weight:getComputedStyle(modal.querySelector('h2')).fontWeight};
   });
   assert(await frame.locator('.history-filter').isHidden());
   assert.equal(layout.weight,'400');
   if(await frame.locator('#historyMonthList .history-day-details').count()===0)await frame.locator('#historyMonthList .history-item-month').first().click();
   await page.waitForTimeout(350);
   await touchSwipe(width*.5,height*.75,12,-130);await page.waitForTimeout(350);
   assert.equal(await page.locator('#sidePage').getAttribute('aria-hidden'),'false','Vertical scrolling must not return home');
   assert(await frame.locator('#historyMonthList').evaluate(e=>e.scrollTop>0),'Native touch scrolling stays functional');
   await page.screenshot({path:`water-demo-android/build/ui-check/browse-history-long-${width}.png`});
   assert.deepEqual(errors,[]);console.log('PASS month-only history, edit, stats animation, full-page horizontal return and light titles',width);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
