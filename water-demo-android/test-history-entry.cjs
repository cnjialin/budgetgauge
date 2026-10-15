const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 for(const [width,height] of [[390,844],[320,568]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.evaluate(()=>localStorage.setItem('water-demo-records',JSON.stringify(Array.from({length:24},(_,i)=>({id:i+1,amount:20+i,category:['餐饮'],time:new Date(new Date().getFullYear(),new Date().getMonth(),1+i%12,12,i%60).toISOString()})))));
  for(const mode of ['keyboard','drag']){
   await page.reload();const side=page.frameLocator('#sideFrame');
   await side.locator('#historyMonthList').waitFor({state:'attached'});
   await side.locator('body').evaluate(()=>{
    window.entryEvents=[];window.entryRows=[];
    const original=Element.prototype.animate;
    Element.prototype.animate=function(...args){
     if(this.matches('.history-item-month'))window.entryRows.push({key:this.dataset.dateKey,time:performance.now()});
     return original.apply(this,args);
    };
    addEventListener('message',event=>{if(event.source===parent&&event.data?.channel==='water-editor')window.entryEvents.push({action:event.data.action,time:performance.now()});});
   });
   if(mode==='keyboard'){
    await page.locator('#water').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(160);
   }else{
    await page.mouse.move(width*.12,height*.55);await page.mouse.down();await page.mouse.move(width*.75,height*.55,{steps:14});await page.waitForTimeout(90);
   }
   const during=await side.locator('body').evaluate(()=>({events:window.entryEvents,rows:window.entryRows,visibility:getComputedStyle(document.querySelector('#historyMonthList')).visibility}));
   assert(during.events.some(e=>e.action==='browse-revealing'),'Entry must signal its reveal before completion');
   assert(!during.events.some(e=>e.action==='browse-entered'),'This sample must precede page completion');
   assert(during.rows.length>0&&during.visibility==='visible','Rows must already unfold while the page is revealing');
   const count=during.rows.length;
   if(mode==='drag')await page.mouse.up();
   await page.waitForTimeout(800);
   const after=await side.locator('body').evaluate(()=>({events:window.entryEvents,rows:window.entryRows}));
   const entered=after.events.find(e=>e.action==='browse-entered');
   assert(entered&&after.rows[0].time<entered.time,'List animation must overlap the page transition');
   assert.equal(after.rows.length,count,'Completing the page must not restart list animations');
   assert.deepEqual(errors,[]);console.log('PASS history rows reveal before page completion, without restart',width,mode);
  }
  await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
