// Profile the actual app draw loop with independently selected sky layers.
const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.addInitScript(()=>{
   window.WaterSensors={setEnabled(){},isAvailable:()=>false,setSkyEnabled(){},isSkyAvailable:()=>true,getSkyDeclination:()=>0,
    requestSkyLocation:()=>dispatchEvent(new CustomEvent('waterskylocation',{detail:{lat:31.23,lon:121.47}})),
    getSkyRotation:()=>{
     const a=performance.now()*.00035,b=135*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
     return JSON.stringify([c,-s*cb,s*sb,s,c*cb,-c*sb,0,sb,cb]);
    }};
  });
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.mouse.move(195,700);await page.mouse.down();await page.mouse.move(195,300,{steps:10});await page.mouse.up();
  await page.waitForTimeout(700);
  await page.evaluate(()=>{
   window.skyTiming=[];const draw=WaterRealSky.draw;WaterRealSky.draw=(...args)=>{const t=performance.now();draw(...args);skyTiming.push(performance.now()-t);};
  });
  const results=[];
  for(const [solar,galaxy] of [[false,false],[true,false],[false,true],[true,true]]){
   await page.evaluate(({solar,galaxy})=>{
    for(const [id,value] of [['realSkyToggle',true],['solarSkyToggle',solar],['galaxySkyToggle',galaxy]]){
     const toggle=document.querySelector('#'+id);if(toggle.checked!==value){toggle.checked=value;toggle.dispatchEvent(new Event('change'));}
    }
   },{solar,galaxy});
   await page.waitForTimeout(500);
   const metrics=await page.evaluate(async()=>{
    skyTiming.length=0;const intervals=[];let last=0;
    for(let i=0;i<120;i++){const now=await new Promise(resolve=>requestAnimationFrame(resolve));if(last)intervals.push(now-last);last=now;}
    const quantile=(a,p)=>a.sort((a,b)=>a-b)[Math.floor(a.length*p)];
    return {medianDrawMs:quantile(skyTiming,.5),p95DrawMs:quantile(skyTiming,.95),p95FrameMs:quantile(intervals,.95),frames:skyTiming.length};
   });
   results.push({stars:true,solar,galaxy,...metrics});
  }
  fs.writeFileSync('outputs/real-sky-profile.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
