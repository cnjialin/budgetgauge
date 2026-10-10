const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {build}=require('esbuild');
const fs=require('fs');const assert=require('assert/strict');
(async()=>{
 const bundle=await build({entryPoints:['sky-gpu-scene.js'],bundle:true,write:false,format:'iife',globalName:'GPUScene'});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  const source=fs.readFileSync('outputs/water-demo.html','utf8');const texture=source.match(/<script id="galaxyTexture"[^>]*>[\s\S]*?<\/script>/)[0];
  await page.setContent(texture);
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  const result=await page.evaluate(async()=>{
   const time=Date.UTC(2000,0,1,12),location={lat:0,lon:79.53938163},m=[1,0,0,0,-1,0,0,0,-1];
   const scene=new GPUScene.SkyGPUScene();let uploads=0,draws=[],composites=0;
   const gl=scene.gl,bufferData=gl.bufferData.bind(gl),drawArrays=gl.drawArrays.bind(gl);
   gl.bufferData=(...args)=>{uploads++;return bufferData(...args);};gl.drawArrays=(...args)=>{draws.push(args);return drawArrays(...args);};
   const output=document.createElement('canvas');output.width=390;output.height=844;const ctx=output.getContext('2d');
   const drawImage=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{composites++;return drawImage(...args);};
   const rows=[[0,0,-1,'',0,0]];
   scene.draw(ctx,m,0,390,844,time,location,rows,true,false,null);
   const star=Array.from(ctx.getImageData(195,422,1,1).data),firstUploads=uploads;
   for(let i=0;i<12;i++){ctx.clearRect(0,0,390,844);scene.draw(ctx,m,0,390,844,time+i*16,location,rows,true,false,null);}
   const stableUploads=uploads===firstUploads;
   const solar={bodies:[{body:'Sun',distance:1,magnitude:-26,phase:1},{body:'Moon',distance:384400/149597870.7,magnitude:-10,phase:.5}],vectors:[[1,0,0],[0,0,1]]};
   ctx.clearRect(0,0,390,844);scene.draw(ctx,m,0,390,844,time,location,rows,false,false,solar);
   const left=ctx.getImageData(185,422,1,1).data[3],right=ctx.getImageData(205,422,1,1).data[3];
   scene.draw(ctx,m,0,390,844,time,location,rows,true,true,solar);
   await new Promise((resolve,reject)=>{if(scene.galaxy.ready)return resolve();const poll=setInterval(()=>{if(scene.galaxy.ready){clearInterval(poll);clearTimeout(timeout);resolve();}},20);const timeout=setTimeout(()=>{clearInterval(poll);reject(Error('Galaxy upload timeout'));},5000);});
   draws=[];const before=composites;ctx.clearRect(0,0,390,844);
   scene.draw(ctx,m,0,390,844,time,location,rows,true,true,solar);
   const allComposites=composites-before,error=gl.getError(),sameContext=scene.stars.gl===gl&&scene.galaxy.gl===gl&&scene.solar.gl===gl;
   const galaxySize=[scene.galaxy.targetWidth,scene.galaxy.targetHeight];
   document.body.append(output);output.style.width='390px';output.style.height='844px';document.body.style.margin='0';document.body.style.background='#00105c';
   const passes=draws.map(d=>[d[0],d[2]]);
   const extension=gl.getExtension('WEBGL_lose_context');
   const eventOnce=name=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error(name+' timeout')),5000);scene.canvas.addEventListener(name,()=>{clearTimeout(timeout);resolve();},{once:true});});
   const lost=eventOnce('webglcontextlost');extension.loseContext();await lost;
   const suspended=scene.draw(ctx,m,0,390,844,time,location,rows,true,true,solar)===false;
   await new Promise(resolve=>setTimeout(resolve,100));
   const restored=eventOnce('webglcontextrestored');extension.restoreContext();await restored;
   const recoveryDraw=scene.draw(ctx,m,0,390,844,time,location,rows,true,true,solar),recoveryError=gl.getError();
   const recovered=recoveryDraw&&recoveryError===0;
   scene.dispose();
   return {star,stableUploads,left,right,allComposites,error,sameContext,galaxySize,passes,suspended,recovered,recoveryDraw,recoveryError};
  });
  assert(result.star[3]>200&&result.star[0]>150,'GPU projects known zenith star to correct centre pixel');
  assert(result.stableUploads,'Catalogue uploaded once, not per frame');
  assert(result.left<40&&result.right>200,'GPU quarter Moon keeps correct illuminated side');
  assert.equal(result.allComposites,1,'All celestial layers composite into water once');
  assert(result.sameContext,'All layers share one WebGL context');assert.equal(result.error,0,'No WebGL errors');
  assert(Math.max(...result.galaxySize)<=512,'Galaxy retains low-resolution render target');
  assert.equal(result.passes.filter(p=>p[0]===0).length,2,'One batched point draw for stars and one for solar bodies');
  assert(result.suspended&&result.recovered,'Shared GPU context recovers after loss: '+JSON.stringify(result));
  await page.screenshot({path:'outputs/sky-gpu-preview.png'});
  console.log('PASS: GPU star projection, static upload, Moon phase, shared context, one composite, low-resolution galaxy and clean GL');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
