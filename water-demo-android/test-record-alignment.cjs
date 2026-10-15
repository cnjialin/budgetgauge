const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 for(const [width,height] of [[390,844],[360,640],[320,568]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.locator('#water').click({position:{x:width*.5,y:height*.4}});
  const frame=page.frameLocator('#recordFrame');await frame.locator('#waterKeypad').waitFor({state:'visible'});
  for(const key of ['1','2','3','4','.','5','6'])await frame.locator(`[data-amount-key="${key}"]`).click();
  await frame.locator('#quickExpenseContinueBtn').click();await page.waitForTimeout(750);
  const placeholder=await frame.locator('#expensePurposeInput').evaluate(input=>{
   const label=getComputedStyle(document.querySelector('.record-category-label')),hint=getComputedStyle(input,'::placeholder');
   return Object.fromEntries(['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','color','opacity'].map(key=>[key,{label:label[key],hint:hint[key]}]));
  });
  for(const [key,styles] of Object.entries(placeholder))assert.equal(styles.hint,styles.label,`Empty category placeholder must match its label: ${key}`);
  await page.screenshot({path:`outputs/record-placeholder-${width}.png`});
  await frame.locator('#expensePurposeInput').fill('餐饮 / 餐馆 / 午餐');await frame.locator('#expensePurposeInput').blur();
  for(const fontSize of [16,20]){
   await frame.locator('html').evaluate((e,size)=>e.style.fontSize=`${size}px`,fontSize);
   const textSizes=await frame.locator('.record-amount-label,.record-time-label,.record-category-label,#expenseDateTimeTrigger,#expensePurposeInput').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).fontSize));
   assert(textSizes.every(size=>size===textSizes[0]),'All record field labels and values must use one text size');
   if(fontSize===16)assert.equal(textSizes[0],'14px');
   const layout=await frame.locator('.record-head-content').evaluate(head=>{
    const textRect=e=>{const range=document.createRange();range.selectNodeContents(e);return range.getBoundingClientRect().toJSON();};
    const row=selector=>{const e=head.querySelector(selector),label=e.querySelector('span'),control=e.querySelector('button,input'),icon=e.querySelector('svg');return {label:label.getBoundingClientRect().toJSON(),text:textRect(label),control:control.getBoundingClientRect().toJSON(),controlText:control.tagName==='BUTTON'?textRect(control):null,icon:icon.getBoundingClientRect().toJSON()};};
    const ring=document.querySelector('#purposeOptions').getBoundingClientRect(),dock=document.querySelector('.record-action-dock').getBoundingClientRect();
    return {time:row('.record-time-field'),category:row('.record-category-field'),head:head.getBoundingClientRect().toJSON(),ring:ring.toJSON(),dock:dock.toJSON(),viewport:innerWidth};
   });
   for(const row of [layout.time,layout.category]){
    assert(Math.abs(row.label.y-row.control.y)<1,'Label and value share the same line box');
    assert(Math.abs(row.label.height-row.control.height)<1);
    assert(Math.abs(row.text.x-row.label.x)<1,'Labels must align to the left of their column');
    assert(Math.abs(row.icon.y+row.icon.height/2-row.control.y-row.control.height/2)<1,'Icon and value must be vertically centered');
    assert(row.control.right<=layout.viewport,'Input must fit on narrow screens');
   }
   assert(Math.abs(layout.time.control.x-layout.category.control.x)<1,'Both values start in the same column');
   assert(Math.abs(layout.time.text.y-layout.time.controlText.y)<1,'Time label and actual date text must share a baseline');
   assert(layout.head.bottom<layout.ring.top,'Metadata must not overlap the category ring');
   assert(layout.ring.bottom<layout.dock.top,'Category ring must not overlap action buttons');
   await page.screenshot({path:`outputs/record-aligned-${width}-${fontSize}.png`});
  }
  await frame.locator('html').evaluate(e=>e.style.fontSize='16px');
  await frame.locator('#expenseDateTimeTrigger').click();
  await frame.locator('#dateTimeConfirmBtn').click();
  await frame.locator('#confirmExpenseBtn').click();
  await page.locator('#recordFrame').waitFor({state:'hidden'});
  const rows=await page.evaluate(()=>JSON.parse(localStorage.getItem('water-demo-records')||'[]'));
  assert.equal(rows.length,1);assert.equal(rows[0].amount,1234.56);assert.deepEqual(rows[0].category,['餐饮','餐馆','午餐']);
  assert.deepEqual(errors,[]);console.log('PASS field columns/baselines, larger text, ring/action spacing, date picker and save',width);
  await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
