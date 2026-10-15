const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  for(const [width,height] of [[390,844],[320,568]]) {
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file:///E:/codex/outputs/water-demo.html');
   assert.equal(await page.locator('.home-brand,.home-dock,.v3-page-caption').count(),0);
   assert.equal(await page.locator('#monthAmount').evaluate(e=>getComputedStyle(e).fontSize),'26px');
   assert.equal(await page.locator('#settingsPage > details').count(),0);
   await page.locator('#water').click({position:{x:width/2,y:height*.4}});
   const frame=page.frameLocator('#recordFrame');
   await frame.locator('#waterKeypad').waitFor({state:'visible'});
   assert.equal(await frame.locator('#quickExpenseContinueBtn').textContent(),'→');
   await frame.locator('[data-amount-key="3"]').click();
   await frame.locator('#quickExpenseContinueBtn').click();await page.waitForTimeout(650);
   const wheel=await frame.locator('#purposeOptions').evaluate(e=>({radius:getComputedStyle(e).borderRadius,w:e.clientWidth,h:e.clientHeight}));
   assert.equal(wheel.radius,'50%');assert(Math.abs(wheel.w-wheel.h)<2);
   assert.equal(await frame.locator('#categoryBackBtn').evaluate(e=>getComputedStyle(e).position),'absolute');
   await frame.locator('#cancelExpenseBtn').click();await page.waitForTimeout(650);
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.locator('#water').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);
   await page.locator('#sideBack').click();await page.waitForTimeout(150);
   assert.equal(await page.locator('#sidePage').getAttribute('aria-hidden'),'true');
   assert.deepEqual(errors,[]);
   console.log('PASS original UI, circular categories, original labels and reduced-motion navigation',width);
   await page.close();
  }
 }finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
