const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.evaluate(()=>localStorage.setItem('water-demo-records',JSON.stringify([
   {id:1,amount:20,category:['餐饮'],time:new Date().toISOString()}
  ])));
  await page.reload();
  const frame=page.frameLocator('#sideFrame');
  await page.locator('#water').focus();await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1100);
  const settled=()=>frame.locator('#historyMonthList').evaluate(list=>new Promise(resolve=>{
   const check=()=>list.classList.contains('history-motion-managed')?requestAnimationFrame(check):resolve();check();
  }));
  const cdp=await page.context().newCDPSession(page);
  for(const action of ['left','right','button','android']){
   await frame.locator('.history-item-month').first().click();await settled();
   assert.equal(await frame.locator('.history-day-details').count(),1);
   if(action==='button')await page.locator('#sideBack').click();
   else if(action==='android')await page.evaluate(()=>window.waterBack());
   else {
    const rect=await frame.locator('.history-day-details').boundingBox();
    const x=195,y=rect.y+Math.min(20,rect.height/2),dx=action==='left'?-110:110;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }
   await frame.locator('.history-day-details').waitFor({state:'detached'});await settled();
   assert.equal(await page.locator('#sidePage').getAttribute('aria-hidden'),'false',action+' must return to the date list');
   await page.waitForTimeout(420);
  }
  await page.evaluate(()=>window.waterBack());
  await page.waitForFunction(()=>document.querySelector('#sidePage').getAttribute('aria-hidden')==='true');
  assert.deepEqual(errors,[]);
  console.log('PASS left/right touch swipes, back button and Android back return one level; next back exits history');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
