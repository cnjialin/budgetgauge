const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('outputs/water-demo.html','utf8').replace('  requestAnimationFrame(frame);\n})();','  window.sideProbe=()=>({progress:sideProgress,direction:sideDirection,base,target,count,cosmeticDrops:drops.filter(d=>d.cosmetic).length,offset:waterOffset,area:width*(height-base),polygon:clippedPool(waterOffset),state:entry.state,waves:Array.from(displacement)});\n  requestAnimationFrame(frame);\n})();');
const area=p=>Math.abs(p.reduce((a,v,i)=>{const n=p[(i+1)%p.length];return a+v.x*n.y-n.x*v.y;},0))/2;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  for(const [width,height] of [[390,844],[360,640]]) {
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/water-demo.html',route=>route.fulfill({contentType:'text/html',body:html}));
   await page.goto('file:///E:/codex/outputs/water-demo.html');
   await page.evaluate(()=>localStorage.setItem('water-demo-records',JSON.stringify([{amount:2000,time:new Date().toISOString()}])));
   await page.reload();await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});
   await page.waitForTimeout(200);
   const original=await page.evaluate(()=>sideProbe());
   await page.mouse.move(width*.85,height*.55);await page.mouse.down();await page.mouse.move(width*.4,height*.55,{steps:18});await page.waitForTimeout(120);
   const pushed=await page.evaluate(()=>sideProbe());
   assert(Math.abs(pushed.progress-.45)<.01);assert(Math.abs(pushed.offset-original.offset)<1,'Circle must not change water level');
   assert(Math.abs(area(pushed.polygon)-original.area)<1,'Water volume stays unchanged');
   const circle=await page.locator('#sideDisk').evaluate(e=>({box:e.getBoundingClientRect().toJSON(),color:getComputedStyle(e).backgroundColor,fill:getComputedStyle(e.firstElementChild).backgroundColor}));
   assert.equal(circle.color,'rgb(0, 0, 0)');assert.equal(circle.fill,'rgb(255, 255, 255)');
   assert(Math.abs(circle.box.width-circle.box.height)<.1,'Expanding drop stays circular');
   assert(circle.box.x+circle.box.width/2>width*.7&&circle.box.x+circle.box.width/2<width*.85,'Circle starts at finger position, not screen edge');
   assert.equal(pushed.state,'water');
   await page.screenshot({path:`water-demo-android/build/ui-check/side-circle-${width}.png`});
   await page.mouse.up();await page.waitForTimeout(550);
   assert.equal(await page.frameLocator('#sideFrame').locator('#statsModalTitle').textContent(),'消费统计');
   assert.equal(await page.evaluate(()=>sideProbe().progress),1);
   assert(await page.locator('#recordFrame').isHidden());
   await page.mouse.move(10,height*.55);await page.mouse.down();await page.mouse.move(width*.65,height*.55,{steps:15});await page.mouse.up();await page.waitForTimeout(550);
   assert.equal(await page.evaluate(()=>sideProbe().progress),0);
   assert.equal(await page.evaluate(()=>sideProbe().cosmeticDrops),0,'Return must shrink to zero without releasing a drop');
   assert.equal(await page.locator('#sideDisk').evaluate(e=>e.hidden),true);
   await page.waitForTimeout(1000);
   const landed=await page.evaluate(()=>sideProbe());assert.equal(landed.count,original.count);assert.equal(landed.target,original.target);
   // A short drag cancels without opening the amount editor.
   await page.mouse.move(width*.8,height*.55);await page.mouse.down();await page.mouse.move(width*.7,height*.55,{steps:5});await page.mouse.up();await page.waitForTimeout(550);
   assert.equal(await page.evaluate(()=>sideProbe().progress),0);assert(await page.locator('#recordFrame').isHidden());
   await page.mouse.move(width*.15,height*.55);await page.mouse.down();await page.mouse.move(width*.65,height*.55,{steps:15});await page.waitForTimeout(100);
   const reverse=await page.evaluate(()=>sideProbe());assert.equal(reverse.direction,-1);assert(Math.abs(area(reverse.polygon)-original.area)<1);
   await page.mouse.up();await page.waitForTimeout(550);assert.equal(await page.frameLocator('#sideFrame').locator('#historyModalTitle').textContent(),'历史消费');
   assert(await page.evaluate(()=>waterBack()));await page.waitForTimeout(550);
   assert.equal(await page.evaluate(()=>sideProbe().progress),0);
   assert.equal(await page.locator('#monthAmount').textContent(),'¥2,000.00');assert.deepEqual(errors,[]);
   await page.locator('#water').focus();await page.keyboard.press('ArrowUp');await page.waitForTimeout(650);assert.equal(await page.locator('#settingsPage').getAttribute('aria-hidden'),'false');
   console.log('PASS white circle with black outline, finger origin, unchanged water, both directions, cancellation, return and vertical settings',width);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
