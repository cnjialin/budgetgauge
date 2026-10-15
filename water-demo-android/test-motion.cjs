const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.evaluate(()=>{
   localStorage.setItem('budget-gauge-categories',JSON.stringify([{id:'food',label:'餐饮',children:[{id:'lunch',label:'午餐',children:[{id:'meal',label:'炒菜'}]}]},...Array.from({length:7},(_,i)=>({id:`other${i}`,label:`其他${i}`}))]));
   localStorage.setItem('water-demo-records',JSON.stringify(Array.from({length:10},(_,i)=>({id:i+1,amount:20+i,category:['餐饮','午餐','炒菜'],time:new Date(new Date().getFullYear(),new Date().getMonth(),1+i%3,12,i).toISOString()}))));
  });
  await page.reload();
  const record=page.frameLocator('#recordFrame'),side=page.frameLocator('#sideFrame');
  await page.locator('#water').click({position:{x:195,y:300}});
  await record.locator('#waterKeypad').waitFor({state:'visible'});
  await record.locator('[data-amount-key="3"]').click();
  const first=await record.locator('#quickExpenseContinueBtn').evaluate(async button=>{
   button.click();await Promise.resolve();
   const timings=Array.from(document.querySelectorAll('.category-fan-leaves > div')).map(e=>e.getAnimations()[0].effect.getTiming());
   if(timings.length<8||timings.some((t,i)=>i&&t.delay-timings[i-1].delay-timings[i-1].duration<11))throw Error('Each leaf must finish and settle before the next starts');
   if(getComputedStyle(document.querySelector('#purposeOptions'),'::after').opacity!=='0')throw Error('Full circle must stay hidden while leaves unfold');
   if(timings.at(-1).delay+timings.at(-1).duration>600)throw Error('Fan must finish quickly');
   if(document.querySelector('.category-fan-leaves > div').querySelectorAll('.category-divider').length!==2)throw Error('First visible sector needs both boundary edges');
   const nodes=['.record-amount-field','.category-fan-leaves > div','.record-action-dock'];
   return nodes.map(selector=>{
    const e=document.querySelector(selector),a=e.getAnimations()[0];
    return {selector,fill:a?.effect.getTiming().fill,duration:a?.effect.getTiming().duration,frames:a?.effect.getKeyframes()};
   });
  });
  assert(first.every(a=>a.fill==='backwards'),'All entrance states must apply before delayed animation starts');
  assert.equal(first[0].frames[0].opacity,'1','Amount must not fade out during handoff');
  assert(first[1].duration>=24&&first[1].duration<=85);assert(first[1].frames[0].transform.startsWith('rotate'));
  assert.equal(first[1].frames.at(-2).transform,first[1].frames.at(-1).transform,'Each leaf holds its final position');
  await record.locator('#purposeOptions').evaluate(e=>e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=10;}));
  await page.screenshot({path:'outputs/motion-fan.png'});
  await record.locator('#purposeOptions').evaluate(e=>e.getAnimations({subtree:true}).forEach(a=>a.play()));
  await record.locator('.category-fan-leaves').waitFor({state:'detached'});
  for(const label of ['餐饮','午餐']) {
   const fan=await record.locator('.category-segment').filter({hasText:label}).evaluate(button=>{
    button.click();return document.querySelector('#purposeOptions').getAnimations({subtree:true}).map(a=>({duration:a.effect.getTiming().duration,time:a.currentTime}));
   });
   assert(fan.some(a=>a.duration>=24&&a.duration<=85&&a.time<30),'Each category level restarts individual rotating leaves');
   await record.locator('.category-fan-leaves').waitFor({state:'detached'});
  }
  await record.locator('#cancelExpenseBtn').click();await page.waitForTimeout(650);
  await side.locator('body').evaluate(()=>{
   window.reveals={rows:0,details:0};const original=Element.prototype.animate;
   Element.prototype.animate=function(...args){
    if(this.matches('.history-item-month'))window.reveals.rows++;
    if(this.matches('.history-day-details'))window.reveals.details++;
    return original.apply(this,args);
   };
  });
  for(let i=0;i<2;i++){
   await page.locator('#water').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(850);
   assert(await side.locator('body').evaluate((_,i)=>window.reveals.rows>=3*(i+1),i),'Every history visit reveals rows again');
   await page.locator('#sideBack').click();await page.waitForFunction(()=>document.querySelector('#sidePage').getAttribute('aria-hidden')==='true');
  }
  await page.locator('#water').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(700);
  await side.locator('.history-item-month').first().click();await page.waitForTimeout(380);
  assert(await side.locator('body').evaluate(()=>window.reveals.details>0),'Day details also unfold');
  await page.evaluate(()=>waterBack());await page.waitForFunction(()=>document.querySelector('#sidePage').getAttribute('aria-hidden')==='true');
  await page.locator('#water').focus();await page.keyboard.press('ArrowUp');await page.waitForTimeout(650);
  const before=await page.locator('#settingsPage h2').evaluate(e=>getComputedStyle(e).scale);
  await page.locator('#settingsPage').evaluate(e=>e.scrollTop=180);await page.waitForTimeout(100);
  const after=await page.locator('#settingsPage h2').evaluate(e=>getComputedStyle(e).scale);
  assert(Number(after)<Number(before),'Settings title responds continuously to scroll');
  const compactSettings=(await page.locator('#settingsPage h2').boundingBox()).y;
  assert(compactSettings>=38&&compactSettings<46,'Compact settings title must leave space below the status bar');
  assert((await page.locator('#settingsPage .water-scroll-heading').boundingBox()).height<85,'Settings header whitespace must collapse with its title');
  assert.equal(await page.locator('#settingsPage .water-scroll-heading').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','Settings header must reveal the actual sky');
  assert.equal(await page.locator('#settingsBack').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  await page.locator('#settingsPage').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(100);
  assert.equal(await page.locator('#settingsBack').evaluate(e=>getComputedStyle(e).visibility),'visible');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);
  assert.equal(await page.locator('#settingsPage h2').evaluate(e=>getComputedStyle(e).scale),'1');
  await page.evaluate(()=>waterBack());await page.waitForTimeout(100);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:420});
  await page.locator('#water').focus();await page.keyboard.press('ArrowDown');await page.waitForTimeout(700);
  await page.locator('#loginConnection summary').click();
  await page.locator('#loginPage').evaluate(e=>e.scrollTop=100);await page.waitForTimeout(100);
  assert.equal(await page.locator('#loginBack').evaluate(e=>getComputedStyle(e).visibility),'hidden','Login hides back button on scroll');
  const loginHeading=await page.locator('#loginPage h2').evaluate(e=>({scale:Number(getComputedStyle(e).scale),top:e.getBoundingClientRect().top}));
  assert(loginHeading.scale<1);assert(loginHeading.top>=38&&loginHeading.top<50,'Login title must leave space below the status bar');
  await page.screenshot({path:'outputs/heading-login-compact.png'});
  await page.locator('#loginPage').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(100);
  assert.equal(await page.locator('#loginBack').evaluate(e=>getComputedStyle(e).visibility),'visible');
  assert.deepEqual(errors,[]);
  console.log('PASS no delayed flash, amount travel, three-level fan, repeat history reveals, detail unfold, settings scroll and reduced motion');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
