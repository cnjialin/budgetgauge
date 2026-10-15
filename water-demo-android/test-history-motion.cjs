const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  for(const [width,height] of [[390,844],[320,568]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file:///E:/codex/outputs/water-demo.html');
   await page.evaluate(()=>localStorage.setItem('water-demo-records',JSON.stringify(Array.from({length:60},(_,i)=>({id:i+1,amount:20+i,category:['餐饮','家庭'],time:new Date(new Date().getFullYear(),new Date().getMonth(),1+i%20,12,i%60).toISOString()})))));
   await page.reload();
   const side=page.frameLocator('#sideFrame');
   await page.locator('#water').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(1000);
   const outer=await side.locator('.history-card').evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth,overflow:getComputedStyle(e).overflow}));
   assert.equal(outer.scrollWidth,outer.width,'Header must not create a bottom horizontal scrollbar');
   assert.equal(outer.overflow,'hidden','Only the ledger list should scroll');
   await side.locator('#historyMonthList').evaluate(e=>e.scrollTop=450);await page.waitForTimeout(350);
   const row=side.locator('.history-item-month').nth(8);
   await row.scrollIntoViewIfNeeded();
   const key=await row.getAttribute('data-date-key');
   const original=await row.boundingBox();
   const compactTitle=await side.locator('#historyModalTitle').boundingBox();
   assert(compactTitle.y>=38&&compactTitle.y<46,'History title must release whitespace while leaving a status-bar gap');
   const listTop=(await side.locator('#historyMonthList').boundingBox()).y;
   assert(listTop<85,'History content must gain space from the collapsed header');
   await side.locator('#historyMonthList').evaluate(list=>{
    window.rebuilds=[];
    new MutationObserver(()=>{
     if(!list.classList.contains('history-motion-managed'))return;
     const selected=list.querySelector('.is-expanded');
     const details=list.querySelector('.history-day-details');
     window.rebuilds.push({expanded:!!selected,selectedAnimations:selected?.getAnimations().length||0,detailsAnimations:details?.getAnimations().length||0});
    }).observe(list,{childList:true});
   });
   for(let cycle=0;cycle<3;cycle++){
    const immediate=await side.locator(`.history-item-month[data-date-key="${key}"]`).evaluate(row=>{
     const before=row.getBoundingClientRect().top;
     row.click();
     const details=document.querySelector('.history-day-details');
     const siblings=Array.from(document.querySelectorAll('.history-item-month:not(.is-expanded)'));
     return {mounted:!!details,delay:details?.getAnimations()[0]?.effect.getTiming().delay,
      jump:Math.abs(document.querySelector('.is-expanded').getBoundingClientRect().top-before),
      pushDelays:siblings.flatMap(card=>card.getAnimations().map(animation=>animation.effect.getTiming().delay)),
      siblings:siblings.length,collapsed:siblings.some(card=>card.classList.contains('is-collapsed-sibling')),
      moving:siblings.some(card=>card.getAnimations().length>0)};
    });
    assert(immediate.mounted,'Details must render in the click task without waiting for outgoing cards');
    assert(immediate.delay>=100&&immediate.delay<420,'Details unfold while the selected date moves into place');
    assert(immediate.siblings>0,'Visible outgoing dates remain during the push animation');
    assert.equal(immediate.collapsed,false,'Other dates must not collapse or disappear');
    assert(immediate.moving,'Other date cards move into their new positions');
    assert(immediate.jump<2,'Selected date starts at its original position rather than jumping to the top');
    assert(new Set(immediate.pushDelays).size>1,'Date cards yield one after another with staggered movement');
    if(cycle===0){
     const sequence=await side.locator('.history-item-month.is-expanded').evaluate(row=>{
      const animation=row.getAnimations()[0];animation.pause();animation.currentTime=10;
      const first={y:row.getBoundingClientRect().top,border:getComputedStyle(row).borderColor};
      animation.currentTime=55;
      const second={y:row.getBoundingClientRect().top,border:getComputedStyle(row).borderColor};
      animation.currentTime=170;
      const moving=row.getBoundingClientRect().top;animation.play();return {first,second,moving};
     });
     assert(Math.abs(sequence.first.y-sequence.second.y)<1,'Border deepens before the date begins moving');
     assert.notEqual(sequence.first.border,sequence.second.border);
     assert(Math.abs(sequence.moving-sequence.first.y)>2,'Selected date subsequently moves');
    }
    await side.locator('#historyMonthList').evaluate(list=>new Promise(resolve=>{const check=()=>list.classList.contains('history-motion-managed')?requestAnimationFrame(check):resolve();check();}));
    assert.equal(await side.locator('.history-day-details').count(),1);
    const layout=await side.locator('#historyMonthList').evaluate(list=>{
     const details=list.querySelector('.history-day-details');
     const siblings=Array.from(list.querySelectorAll('.history-item-month:not(.is-expanded)'));
     return siblings.length===0&&list.querySelectorAll('.history-item-month').length===1;
    });
    assert(layout,'Detail view contains only the selected date, even when scrolling down');
    assert(await side.locator('#historyMonthList').evaluate(()=>window.rebuilds.filter(r=>r.expanded).every(r=>r.selectedAnimations>0&&r.detailsAnimations>0)),'New detail layout must have first animation frames installed before observers/paint');
    const closing=await side.locator('.history-item-month.is-expanded').evaluate(row=>{
     const key=row.dataset.dateKey;row.click();
     const target=Array.from(document.querySelectorAll('.history-item-month')).find(e=>e.dataset.dateKey===key);
     const outgoing=document.querySelector('.history-outgoing-layer .history-day-detail-row');
     return {border:getComputedStyle(target).borderColor,details:document.querySelectorAll('.history-day-details').length,folding:outgoing?.getAnimations().some(a=>a.playState==='running')};
    });
    assert.equal(closing.border,'rgb(85, 85, 85)','Keep the selected outline while the card moves home');
    assert.equal(closing.details,0,'Restore overview immediately during collapse');
    assert(closing.folding,'Detail cards must actually animate out');
    await side.locator('#historyMonthList').evaluate(list=>new Promise(resolve=>{const check=()=>list.classList.contains('history-motion-managed')?requestAnimationFrame(check):resolve();check();}));
    assert.equal(await side.locator('.history-day-details').count(),0);
    const restored=await side.locator(`.history-item-month[data-date-key="${key}"]`).boundingBox();
    assert.equal(await side.locator(`.history-item-month[data-date-key="${key}"]`).evaluate(e=>getComputedStyle(e).borderColor),'rgb(221, 221, 221)','Restore the ordinary outline only after returning');
    assert(Math.abs(restored.y-original.y)<2,'Restore the original row position without a scroll jump');
   }
   assert.equal(await page.locator('#sideBack').evaluate(e=>getComputedStyle(e).visibility),'hidden','Scrolled header leaves only the title');
   await side.locator('#historyMonthList').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(100);
   assert.equal(await page.locator('#sideBack').evaluate(e=>getComputedStyle(e).visibility),'visible');
   await page.locator('#sideBack').click();await page.waitForTimeout(60);
   assert.equal(await page.locator('#sidePage').getAttribute('aria-hidden'),'false','Finish card collapse before leaving the page');
   await page.waitForTimeout(850);
   assert.equal(await page.locator('#sidePage').getAttribute('aria-hidden'),'true');
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.locator('#water').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);
   await side.locator('.history-item-month').first().click();await page.waitForTimeout(80);
   await side.locator('.history-item-month.is-expanded').click();await page.waitForTimeout(80);
   assert.equal(await side.locator('.history-day-details').count(),0);
   assert.deepEqual(errors,[]);
   console.log('PASS prepaint first frames, detail fold before removal, repeated open/close, scroll restoration, page exit and reduced motion',width);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
