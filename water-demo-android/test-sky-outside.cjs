const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  for(const disableGPU of [false,true]){
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({disableGPU})=>{
    localStorage.setItem('water-ink','#00105c');localStorage.setItem('water-real-sky','1');
    window.WaterSensors={isAvailable:()=>false,isSkyAvailable:()=>true,setEnabled(){},setSkyEnabled(){},getSkyDeclination:()=>0,
     getSkyRotation:()=>JSON.stringify([1,0,0,0,-1,0,0,0,-1]),requestSkyLocation:()=>dispatchEvent(new CustomEvent('waterskylocation',{detail:{lat:31.23,lon:121.47}}))};
    if(disableGPU){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'?null:original.call(this,kind,...args);};}
   },{disableGPU});
   await page.goto('file:///E:/codex/outputs/water-demo.html');
   await page.waitForFunction(()=>document.querySelector('#realSkyStatus').textContent.includes('真实星空已开启'));
   await page.waitForFunction(()=>{
    const pixels=document.querySelector('#water').getContext('2d').getImageData(0,0,390,300).data;let colored=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>20&&pixels[i]<4&&Math.abs(pixels[i+1]-16)<4&&Math.abs(pixels[i+2]-92)<4)colored++;
    return colored>50;
   });
   assert.deepEqual(errors,[],'No page errors with GPU '+!disableGPU);
   if(!disableGPU)await page.screenshot({path:'outputs/sky-outside-preview.png'});
   await page.close();
  }
  console.log('PASS: theme-colored stars visible outside water with GPU and Canvas fallback');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
