const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  for(const mode of ['resize','overlay','native']) {
   const page=await browser.newPage({viewport:{width:360,height:740}});
   if(mode==='overlay')await page.addInitScript(()=>{
    const viewport=new EventTarget();viewport.height=740;viewport.offsetTop=0;
    Object.defineProperty(window,'visualViewport',{value:viewport});
   });
   await page.goto('file:///E:/codex/outputs/water-demo.html');
   await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});
   const keyboard=async height=>{
    if(mode==='resize')await page.setViewportSize({width:360,height});
    else if(mode==='overlay')await page.evaluate(h=>{visualViewport.height=h;visualViewport.dispatchEvent(new Event('resize'));},height);
    else await page.evaluate(h=>dispatchEvent(new CustomEvent('waterkeyboard',{detail:{visibleFraction:h/innerHeight}})),height);
    await page.waitForTimeout(100);
   };
   const check=async id=>{
    await page.locator(id).focus();await keyboard(330);
    const box=await page.locator(id).boundingBox();
    assert(box.y>=23&&box.y+box.height<=299,`${mode} ${id} must be above keyboard: ${JSON.stringify(box)}`);
    assert.equal(await page.evaluate(()=>scrollY),0,'Only the panel should scroll');
    if(mode==='native')assert.equal(await page.locator('main').evaluate(e=>e.getBoundingClientRect().height),740,'Native keyboard must not shrink the background');
    await keyboard(740);
   };
   await page.locator('#water').focus();await page.keyboard.press('ArrowUp');await page.waitForTimeout(650);
   await check('#monthlyQuota');await page.locator('#monthlyQuota').fill('9000');await page.locator('#saveQuota').click();await page.waitForTimeout(650);
   await page.locator('#water').focus();await page.keyboard.press('ArrowDown');await page.waitForTimeout(650);
   await check('#loginEmail');await check('#loginPassword');
   await page.locator('#loginConnection summary').click();await check('#loginUrl');await check('#loginKey');
   await page.evaluate(()=>window.waterBack());await page.waitForTimeout(650);
   assert.equal(await page.locator('#loginPage').getAttribute('aria-hidden'),'true');
   assert.equal(await page.locator('main').evaluate(e=>e.getBoundingClientRect().height),740);
   console.log('PASS keyboard',mode,'quota/email/password/connection inputs and restored home');
   await page.close();
  }
 }finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
