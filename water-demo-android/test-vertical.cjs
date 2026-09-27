const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const html=fs.readFileSync('outputs/water-demo.html','utf8').replace(/(<script id="recordBundle" type="application\/json">)[\s\S]*?(<\/script>)/,'$1$2').replace('  requestAnimationFrame(frame);\n})();','  window.gestureProbe=()=>({settingsProgress,loginProgress,state:entry.state,sideProgress});\n  requestAnimationFrame(frame);\n})();');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
for(const [width,height] of [[390,844],[360,640]]){
const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/water-demo.html',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('file:///E:/codex/outputs/water-demo.html');
async function drag(y,dy){await page.mouse.move(width-12,y);await page.mouse.down();await page.mouse.move(width-12,y+dy,{steps:10});await page.waitForTimeout(150);}
async function release(){await page.mouse.up();await page.waitForTimeout(650);}
await drag(height*.7,-height*.3);assert(Math.abs((await page.evaluate(()=>gestureProbe())).settingsProgress-.3)<.01);await release();assert.equal((await page.evaluate(()=>gestureProbe())).settingsProgress,1);
await drag(height*.3,height*.3);assert(Math.abs((await page.evaluate(()=>gestureProbe())).settingsProgress-.7)<.01);await release();assert.equal((await page.evaluate(()=>gestureProbe())).settingsProgress,0);
await drag(height*.4,height*.3);assert(Math.abs((await page.evaluate(()=>gestureProbe())).loginProgress-.3)<.01);await release();assert.equal((await page.evaluate(()=>gestureProbe())).loginProgress,1);
await page.locator('#loginPage').evaluate(e=>e.scrollTop=e.scrollHeight);
await drag(height*.7,-height*.3);assert(Math.abs((await page.evaluate(()=>gestureProbe())).loginProgress-.7)<.01);await release();assert.equal((await page.evaluate(()=>gestureProbe())).loginProgress,0);
await drag(height*.7,-height*.1);await release();assert.equal((await page.evaluate(()=>gestureProbe())).settingsProgress,0);assert.equal((await page.evaluate(()=>gestureProbe())).state,'water');
// Touch return keeps native scrolling inside the page, and follows a drag at its edge.
await page.locator('#water').focus();await page.keyboard.press('ArrowUp');await page.waitForTimeout(650);
await page.evaluate(()=>{const el=document.querySelector('#settingsPage');el.scrollTop=0;const fire=(type,y)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:type==='touchend'?[]:[{clientX:innerWidth-12,clientY:y}]});el.dispatchEvent(e);};fire('touchstart',100);fire('touchmove',250);window.finishTouch=()=>fire('touchend',250);});await page.waitForTimeout(150);
assert(Math.abs((await page.evaluate(()=>gestureProbe())).settingsProgress-(1-150/height))<.01);
await page.evaluate(()=>finishTouch());await page.waitForTimeout(650);assert.deepEqual(errors,[]);console.log('PASS vertical follow, return, cancellation and touch',width,height);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
