const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let calls=0, mode='new';
  await page.addInitScript(()=>{window.opened=[];window.WaterSensors={isAvailable:()=>false,getAppVersion:()=> '2.0.0',openReleaseUrl:url=>{window.opened.push(url);return true;}}});
  await page.route('https://api.github.com/repos/cnjialin/budgetgauge/releases/latest',async route=>{
   calls++;
   if(mode==='error')return route.fulfill({status:403,body:'rate limited'});
   const tag=mode==='equal'?'v2.0.0':mode==='older'?'v0.3.1':mode==='numeric'?'v2.10.0':'v2.0.1';
   await route.fulfill({json:{tag_name:tag,assets:[{name:mode==='legacy'?'app-release.apk':'water-demo.apk',state:'uploaded',browser_download_url:`https://github.com/cnjialin/budgetgauge/releases/download/${tag}/water-demo.apk`}]}});
  });
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.waitForTimeout(800);assert.equal(calls,0,'No startup update request');
  await page.waitForTimeout(1600);
  await page.mouse.move(195,650);await page.mouse.down();await page.mouse.move(195,140,{steps:14});await page.mouse.up();
  await page.waitForTimeout(700);
  const check=()=>page.locator('#checkUpdate').click();
  await check();await page.waitForFunction(()=>!document.querySelector('#downloadUpdate').hidden);
  assert.match(await page.locator('#updateStatus').innerText(),/v2.0.1/);
  assert.equal(await page.evaluate(()=>window.opened.length),0,'Download requires confirmation');
  await page.locator('#downloadUpdate').click();
  assert.match(await page.evaluate(()=>window.opened[0]),/v2.0.1\/water-demo.apk$/);
  for(mode of ['equal','older']){await check();await page.waitForFunction(()=>document.querySelector('#updateStatus').textContent==='当前已是最新版本');assert(await page.locator('#downloadUpdate').isHidden());}
  mode='numeric';await check();await page.waitForFunction(()=>document.querySelector('#updateStatus').textContent.includes('v2.10.0'));
  mode='legacy';await check();await page.waitForFunction(()=>document.querySelector('#updateStatus').textContent.includes('暂未就绪'));assert(await page.locator('#downloadUpdate').isHidden());
  mode='error';await check();await page.waitForFunction(()=>document.querySelector('#updateStatus').textContent.includes('检查失败'));assert.equal(await page.locator('#checkUpdate').isEnabled(),true);
  await page.locator('#releasePageLink').click();assert.equal(await page.evaluate(()=>window.opened.at(-1)),'https://github.com/cnjialin/budgetgauge/releases');
  assert.deepEqual(errors,[]);
  console.log('Update checks passed: manual request, version comparison, confirmation, browser bridge, legacy asset rejection, retry.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
