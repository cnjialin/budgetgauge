const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.skyCalls=[];window.skySnapshot='';window.WaterSensors={isAvailable:()=>false,isSkyAvailable:()=>true,setEnabled(){},setSkyEnabled:v=>window.skyCalls.push(v),getSkyRotation:()=>window.skySnapshot,getSkyDeclination:()=>0,requestSkyLocation:()=>dispatchEvent(new CustomEvent('waterskylocation',{detail:{lat:31.23,lon:121.47}}))};});
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  assert.match(await page.locator('#appVersionLabel').textContent(),/2\.1\.0/);
  assert.equal(await page.locator('#realSkyToggle').isChecked(),false);
  await page.mouse.move(195,700);await page.mouse.down();await page.mouse.move(195,300,{steps:10});await page.mouse.up();
  await page.locator('#realSkyToggle').check();
  await page.waitForFunction(()=>skyCalls.includes(true));
  await page.evaluate(()=>{window.skySnapshot=JSON.stringify([1,0,0,0,-1,0,0,0,-1]);});
  await page.waitForFunction(()=>document.querySelector('#realSkyStatus').textContent.includes('真实星空已开启'));
  assert.deepEqual(errors,[]);
  assert.match(await page.locator('#realSkyStatus').textContent(),/真实星空已开启/);
  assert.equal(await page.locator('#skyControls').count(),0);
  assert.equal(await page.locator('#skyLocate').count(),0);
  fs.mkdirSync('outputs',{recursive:true});await page.screenshot({path:'outputs/real-sky-settings.png',fullPage:true});
  assert.equal(await page.locator('#settingsPage').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  await page.locator('#simulatedSkyToggle').check();
  assert.equal(await page.locator('#realSkyToggle').isChecked(),false,'Simulation automatically disables real stars');
  assert.equal(await page.evaluate(()=>skyCalls.at(-1)),false,'Simulation does not require direction tracking');
  await page.evaluate(()=>{
    window.simulationArcs=0;const arc=CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc=function(...args){simulationArcs++;return arc.apply(this,args);};
  });
  await page.locator('[data-ink="#854536"]').click();
  await page.waitForFunction(()=>simulationArcs>4000);
  assert.equal(await page.locator('#simulatedSkyToggle').isChecked(),true,'Color changes preserve the simulation switch');
  await page.locator('#realSkyToggle').check();
  assert.equal(await page.locator('#simulatedSkyToggle').isChecked(),false,'Real stars automatically disable simulation');
  await page.locator('#simulatedSkyToggle').check();
  await page.reload();assert.equal(await page.locator('#realSkyToggle').isChecked(),false);
  assert.equal(await page.locator('#simulatedSkyToggle').isChecked(),true,'Exclusive mode survives reload');
  assert.deepEqual(errors,[]);
  console.log('PASS: sky switches, mutual exclusion, simulation on other colors, persistence, sensor shutdown and layout');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
