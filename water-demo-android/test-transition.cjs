const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 for(const [x,y] of [[195,422],[30,80],[350,780]]) {
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});
  const result=await page.evaluate(async({x,y})=>{
   const disk=document.querySelector('#entryDisk'),frame=document.querySelector('#recordFrame');
   const header=document.querySelector('main > header'),light=document.querySelector('#lightHeader');
   document.querySelector('#water').dispatchEvent(new MouseEvent('click',{clientX:x,clientY:y,detail:1}));
   const started=performance.now();let coveredAt=null;
   for(let i=0;i<180;i++) {
    await new Promise(requestAnimationFrame);
    const r=disk.getBoundingClientRect(),radius=r.width/2,cx=r.x+radius,cy=r.y+radius;
    const required=Math.hypot(Math.max(cx,innerWidth-cx),Math.max(cy,innerHeight-cy));
    if(radius>=required-.05 && coveredAt===null)coveredAt=performance.now();
    if(!frame.hidden)return {elapsed:performance.now()-started,gap:performance.now()-coveredAt,covered:coveredAt!==null,below:[header,light].every(e=>+getComputedStyle(e).zIndex < +getComputedStyle(disk).zIndex),ready:frame.contentDocument.body.classList.contains('quick-expense-mode')};
   }
   throw Error('Editor never appeared');
  },{x,y});
  assert(result.covered&&result.gap<25&&result.ready&&result.below,JSON.stringify(result));
  assert(result.elapsed<290,'The prepared keypad should appear after the 200ms expansion: '+JSON.stringify(result));
  await page.frameLocator('#recordFrame').locator('[data-amount-key="3"]').click();
  assert.equal(Number(await page.frameLocator('#recordFrame').locator('#remainingBudget').textContent()),3,'Keypad must accept input immediately after handoff');
  console.log('PASS',x,y,result);
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
