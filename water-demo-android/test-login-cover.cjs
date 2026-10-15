const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const html=fs.readFileSync('outputs/water-demo.html','utf8')
  .replace('const n=waterNormal,fill=settingsProgress','window.loginSceneTransform={x:ctx.getTransform().e,y:ctx.getTransform().f};const n=waterNormal,fill=settingsProgress')
  .replace("    document.querySelector('#waterTextClip')?.setAttribute", "    window.loginWaterSurface=clipPoints[1].y;document.querySelector('#waterTextClip')?.setAttribute")
  .replace('  requestAnimationFrame(frame);\n})();','  window.loginCoverProbe=()=>({progress:loginProgress,offset:waterOffset,surface:window.loginWaterSurface,transform:window.loginSceneTransform});\n  requestAnimationFrame(frame);\n})();');
 for(const [width,height] of [[390,844],[320,568]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('water-real-sky','1');localStorage.setItem('water-outside-sky','1');localStorage.setItem('water-ink','#00105c');
   window.WaterSensors={isAvailable:()=>false,isSkyAvailable:()=>true,setEnabled(){},setSkyEnabled(){},getSkyDeclination:()=>0,
    getSkyRotation:()=>JSON.stringify([1,0,0,0,-1,0,0,0,-1]),requestSkyLocation:()=>dispatchEvent(new CustomEvent('waterskylocation',{detail:{lat:31.23,lon:121.47}}))};
  });
  await page.route('**/water-demo.html',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.evaluate(()=>localStorage.setItem('water-demo-records',JSON.stringify([{id:1,amount:4000,time:new Date().toISOString()}])));
  await page.reload();await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});await page.waitForTimeout(150);
  await page.waitForFunction(()=>{
   const pixels=document.querySelector('#water').getContext('2d').getImageData(0,0,innerWidth,Math.floor(innerHeight*.25)).data;
   let count=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>20)count++;return count>50;
  });
  await page.evaluate(()=>{
   const pixels=document.querySelector('#water').getContext('2d').getImageData(0,0,innerWidth,Math.floor(innerHeight*.25)).data;
   window.loginStarAlpha=Array.from(pixels).filter((_,i)=>i%4===3);
  });
  const before=await page.evaluate(()=>loginCoverProbe());
  await page.mouse.move(14,height*.3);await page.mouse.down();await page.mouse.move(14,height*.65,{steps:14});await page.waitForTimeout(100);
  const during=await page.evaluate(()=>loginCoverProbe());
  assert(during.progress>.25&&during.progress<.45,'Sample must be mid-drag');
  assert.equal(during.transform.y,before.transform.y,'Login must not translate the scene canvas');
  assert.equal(during.transform.x,before.transform.x);
  assert(Math.abs(during.offset-before.offset)<1,'Login must not move the water level');
  assert(Math.abs(during.surface-before.surface-height*during.progress)<2,'Water must move down while the sky stays in screen coordinates');
  const stars=await page.evaluate(()=>{
   const pixels=document.querySelector('#water').getContext('2d').getImageData(0,0,innerWidth,Math.floor(innerHeight*.25)).data;
   let visible=0,changed=0;for(let i=0;i<window.loginStarAlpha.length;i++){
    if(window.loginStarAlpha[i]>20)visible++;
    if(Math.abs(window.loginStarAlpha[i]-pixels[i*4+3])>15)changed++;
   }return {visible,changed};
  });
  assert(stars.changed/stars.visible<.05,'Real sky pixels must retain their screen positions: '+JSON.stringify(stars));
  const cover=await page.locator('#loginPage').evaluate(e=>({bottom:e.getBoundingClientRect().bottom,background:getComputedStyle(e).backgroundColor}));
  assert.equal(cover.background,'rgba(0, 0, 0, 0)','Login must reveal the white inverted sky');
  assert(Math.abs(cover.bottom-height*during.progress)<2,'Login form still enters from above');
  await page.screenshot({path:`outputs/login-cover-${width}.png`});
  await page.mouse.up();await page.waitForTimeout(700);
  assert.equal(await page.locator('#loginPage .water-scroll-heading').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  assert((await page.locator('#monthAmount').boundingBox()).y>height,'Home amount moves out with the water');
  await page.screenshot({path:`outputs/login-sky-overlay-${width}.png`});
  await page.evaluate(()=>waterBack());await page.waitForTimeout(700);
  const after=await page.evaluate(()=>loginCoverProbe());
  assert.equal(after.progress,0);assert.equal(after.transform.y,before.transform.y);
  assert.deepEqual(errors,[]);console.log('PASS stationary sky, moving water, transparent login overlay and return',width);
  await page.close();
 }
 const simulated=await browser.newPage({viewport:{width:390,height:844}});
 await simulated.addInitScript(()=>{localStorage.setItem('water-simulated-sky','1');localStorage.setItem('water-ink','#00105c');});
 await simulated.goto('file:///E:/codex/outputs/water-demo.html');
 await simulated.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});
 await simulated.locator('#water').focus();await simulated.keyboard.press('ArrowDown');await simulated.waitForTimeout(750);
 const inverted=await simulated.evaluate(()=>{
  const pixels=document.querySelector('#water').getContext('2d').getImageData(0,0,390,844).data;let colored=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>15&&pixels[i]<8&&Math.abs(pixels[i+1]-16)<8&&Math.abs(pixels[i+2]-92)<8)colored++;
  return colored;
 });
 assert(inverted>100,'Simulated sky must also remain visible in theme color behind the login form');
 await simulated.screenshot({path:'outputs/login-simulated-sky-overlay.png'});await simulated.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
