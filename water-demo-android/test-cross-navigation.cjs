const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 for(const [width,height] of [[390,844],[320,568]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});
  const cdp=await page.context().newCDPSession(page);
  const swipe=async(direction)=>{
   const x=direction==='history'?12:width-12,y=height*.58,dx=direction==='history'?width*.64:-width*.64;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(800);
  };
  for(const origin of ['home','settings','login']){
   if(origin!=='home'){
    await page.locator('#water').focus();await page.keyboard.press(origin==='settings'?'ArrowUp':'ArrowDown');await page.waitForTimeout(700);
    if(origin==='settings')await page.locator('#settingsPage').evaluate(e=>e.scrollTop=160);
   }
   for(const destination of ['history','stats']){
    await swipe(destination);
    assert.equal(await page.locator('#sidePage').getAttribute('aria-hidden'),'false',`${origin} must open ${destination}`);
    assert(await page.frameLocator('#sideFrame').locator(destination==='history'?'#historyModal':'#statsModal').isVisible());
    assert.equal(await page.locator('#sidePage').evaluate(e=>getComputedStyle(e).zIndex),'6','Side page must cover both vertical pages');
    if(origin==='login')assert.equal(await page.locator('#loginPassword').inputValue(),'');
    await page.evaluate(()=>waterBack());await page.waitForFunction(()=>document.querySelector('#sidePage').getAttribute('aria-hidden')==='true');
    if(origin!=='home')assert.equal(await page.locator(`#${origin}Page`).getAttribute('aria-hidden'),'false','Returning restores the originating vertical page');
    if(origin==='settings')assert.equal(await page.locator('#settingsPage').evaluate(e=>e.scrollTop),160,'Horizontal navigation preserves settings scroll');
   }
   if(origin!=='home'){await page.evaluate(()=>waterBack());await page.waitForTimeout(700);}
  }
  const initial=(await page.locator('#monthAmount').boundingBox()).y;
  await page.mouse.move(width*.5,height*.75);await page.mouse.down();await page.mouse.move(width*.5,height*.66,{steps:8});await page.waitForTimeout(100);
  const moving=await page.locator('#monthAmount').evaluate(e=>({y:e.getBoundingClientRect().top,visibility:getComputedStyle(e).visibility}));
  assert(moving.y<initial-20,'Home amount follows the settings drag upward');
  assert.equal(moving.visibility,'visible','Home amount must slide out rather than become hidden');
  await page.screenshot({path:`outputs/settings-amount-travel-${width}.png`});
  await page.mouse.up();await page.waitForTimeout(700);
  assert.deepEqual(errors,[]);console.log('PASS touch horizontal navigation from three pages, return/scroll retention, and home amount travel',width);
  await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
