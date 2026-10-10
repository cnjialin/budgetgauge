const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.skyCalls=[];window.skySnapshot=JSON.stringify([1,0,0,0,-1,0,0,0,-1]);window.skyWorkers=[];window.galaxyDraws=0;window.skyGL=[];
   Date.now=()=>Date.UTC(2024,3,23,23,49);
   window.WaterSensors={isAvailable:()=>false,isSkyAvailable:()=>true,setEnabled(){},setSkyEnabled:v=>skyCalls.push(v),getSkyRotation:()=>skySnapshot,getSkyDeclination:()=>0,requestSkyLocation:()=>dispatchEvent(new CustomEvent('waterskylocation',{detail:{lat:31.23,lon:121.47}}))};
   const NativeWorker=Worker;
   window.Worker=class extends NativeWorker{constructor(...args){super(...args);skyWorkers.push(this);this.addEventListener('message',e=>{this.lastResult=e.data;});}terminate(){this.wasTerminated=true;super.terminate();}};
   const getContext=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(kind,...args){const ctx=getContext.call(this,kind,...args);if(kind==='webgl'&&ctx){skyGL.push(ctx);const draw=ctx.drawArrays.bind(ctx);ctx.drawArrays=(...args)=>{galaxyDraws++;return draw(...args);};}return ctx;};
  });
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  assert.equal(await page.locator('[role="switch"]').count(),5);
  await page.mouse.move(195,700);await page.mouse.down();await page.mouse.move(195,300,{steps:10});await page.mouse.up();
  // Solar alone must start tracking without enabling the real-star switch.
  await page.locator('#solarSkyToggle').check();
  await page.waitForFunction(()=>skyWorkers[0]?.lastResult?.bodies?.length===9);
  assert.equal(await page.locator('#realSkyToggle').isChecked(),false);
  const light=await page.evaluate(()=>skyWorkers[0].lastResult.bodies.find(b=>b.body==='Moon').phase);assert(light>.999);
  // Aim the phone at the full Moon above the horizon and verify actual pixels.
  const moonPixels=await page.evaluate(async()=>{
    const moon=skyWorkers[0].lastResult.bodies.find(b=>b.body==='Moon'),time=Date.now();
    const d=time/86400000+2440587.5-2451545,lst=(280.46061837+360.98564736629*d)%360;
    let longitude=moon.ra*180/Math.PI-lst;longitude=((longitude+540)%360)-180;
    dispatchEvent(new CustomEvent('waterskylocation',{detail:{lat:moon.dec*180/Math.PI,lon:longitude}}));
    for(let i=0;i<10;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
    const canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;
    const ctx=canvas.getContext('2d');WaterRealSky.draw(ctx,390,844);
    const pixels=ctx.getImageData(165,392,60,60).data;let visible=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100&&pixels[i]>100)visible++;
    return visible;
  });
  assert(moonPixels>900&&moonPixels<1800,'Moon disc is clearly larger than the seven-pixel planets');
  await page.locator('#galaxySkyToggle').check();await page.waitForFunction(()=>galaxyDraws>5);
  assert.equal(await page.evaluate(()=>skyGL[0].getError()),0,'No WebGL errors');
  await page.locator('#realSkyToggle').check();
  await page.screenshot({path:'outputs/sky-extras-settings.png'});
  // All three independent flags survive a reload.
  await page.reload();for(const id of ['realSkyToggle','solarSkyToggle','galaxySkyToggle'])assert(await page.locator('#'+id).isChecked());
  await page.waitForFunction(()=>skyWorkers[0]?.lastResult?.bodies?.length===9&&galaxyDraws>5);
  await page.evaluate(()=>dispatchEvent(new CustomEvent('waterforeground',{detail:{active:false}})));
  assert.equal(await page.evaluate(()=>skyWorkers[0].wasTerminated),true);assert.equal(await page.evaluate(()=>skyCalls.at(-1)),false);
  const draws=await page.evaluate(()=>galaxyDraws);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>galaxyDraws),draws,'No galaxy drawing in background');
  await page.evaluate(()=>dispatchEvent(new CustomEvent('waterforeground',{detail:{active:true}})));
  await page.waitForFunction(()=>skyWorkers.at(-1)?.lastResult?.bodies?.length===9&&galaxyDraws>10);
  await page.mouse.move(195,700);await page.mouse.down();await page.mouse.move(195,300,{steps:10});await page.mouse.up();
  await page.locator('#realSkyToggle').uncheck();assert.equal(await page.evaluate(()=>skyCalls.at(-1)),true,'Extras keep direction tracking alive');
  await page.locator('#solarSkyToggle').uncheck();assert.equal(await page.evaluate(()=>skyWorkers.at(-1).wasTerminated),true);
  await page.locator('#galaxySkyToggle').uncheck();assert.equal(await page.evaluate(()=>skyCalls.at(-1)),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: independent switches, actual worker ephemeris/month phase, WebGL output, saved settings, background suspension and feature shutdown');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
