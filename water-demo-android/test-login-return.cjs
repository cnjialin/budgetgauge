const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 for(const [width,height] of [[390,844],[320,568]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});
  const cdp=await page.context().newCDPSession(page);
  const open=async()=>{await page.locator('#water').focus();await page.keyboard.press('ArrowDown');await page.waitForTimeout(650);};
  const swipeFrom=async(selector,pause=false)=>{
   const box=await page.locator(selector).boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2,distance=Math.min(160,y-12);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=12;i++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-distance*i/12}]});
    await page.waitForTimeout(15);
   }
   if(pause)await page.waitForTimeout(160);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>document.querySelector('#loginPage').getAttribute('aria-hidden')==='true');await page.waitForTimeout(650);
  };
  await open();
  await page.locator('#loginEmail').tap();await page.keyboard.type('person@example.com');
  assert.equal(await page.locator('#loginEmail').inputValue(),'person@example.com','Ordinary input taps must focus and accept text');
  await page.locator('#loginPassword').fill('synthetic-password');await page.locator('#loginPassword').blur();
  await page.locator('#loginConnection summary').tap();assert.equal(await page.locator('#loginConnection').evaluate(e=>e.open),true);
  await page.locator('#loginConnection summary').tap();assert.equal(await page.locator('#loginConnection').evaluate(e=>e.open),false);
  await page.evaluate(()=>{
   window.returnSubmitCount=0;document.querySelector('#loginForm').addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();window.returnSubmitCount++;},true);
  });
  await page.locator('#loginSubmit').tap();assert.equal(await page.evaluate(()=>window.returnSubmitCount),1,'Ordinary button taps must still work');
  await swipeFrom('#loginSubmit');assert.equal(await page.evaluate(()=>window.returnSubmitCount),1,'Swiping on a button must not submit');
  for(const selector of ['#loginEmail','#loginPassword','#loginConnection summary']){
   await open();await swipeFrom(selector,selector==='#loginPassword');
   assert.equal(await page.locator('#loginConnection').evaluate(e=>e.open),false,'Swiping must not toggle clickable details');
  }
  await page.setViewportSize({width,height:420});await open();
  await page.locator('#loginConnection').evaluate(e=>e.open=true);
  await page.locator('#loginPage').evaluate(e=>e.scrollTop=e.scrollHeight);await page.waitForTimeout(100);
  await page.locator('#loginPage').evaluate(e=>e.scrollTop=e.scrollHeight-e.clientHeight-36);await page.waitForTimeout(100);
  const remaining=await page.locator('#loginPage').evaluate(e=>e.scrollHeight-e.clientHeight-e.scrollTop);
  assert(remaining>30,'This gesture must begin before reaching the scroll boundary');
  await swipeFrom('#loginSubmit');
  assert.deepEqual(errors,[]);console.log('PASS return from inputs/buttons/summary, normal taps, paused swipe, and scroll-to-return handoff',width);
  await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
