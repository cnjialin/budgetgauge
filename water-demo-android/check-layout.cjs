const { chromium } = require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const assert = require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 fs.mkdirSync('water-demo-android/build/ui-check',{recursive:true});
 for(const [width,height] of [[390,844],[360,640],[320,568]]) {
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.screenshot({path:`water-demo-android/build/ui-check/home-${width}.png`});
  assert((await page.locator('main > header').innerText()).replace(/\s+/g,'')==='本月支出¥0.00');
  await page.mouse.move(width/2,height*.8);await page.mouse.down();
  await page.mouse.move(width/2,height*.4,{steps:10});await page.mouse.up();
  await page.waitForTimeout(700);
  assert(await page.locator('#monthlyQuota').inputValue()==='8000');
  assert(await page.locator('#recordFrame').isHidden(),'Swipe must not trigger recording');
  await page.screenshot({path:`water-demo-android/build/ui-check/settings-${width}.png`});
  await page.locator('[data-ink="#234b40"]').click();
  const categories=page.frameLocator('#recordFrame');
  await page.locator('#inlineCategories details').first().locator(':scope > summary').click();
  assert(await page.locator('#recordFrame').isHidden(),'Expanding categories must stay inline');
  if(width===390) {
    await page.locator('#addInlineCategory').click();
    await categories.locator('#categoryAddInput').fill('测试分类');
    await categories.locator('#confirmCategoryAddBtn').click();
    await page.locator('#recordFrame').waitFor({state:'hidden'});
    assert(await page.locator('#inlineCategories summary span').filter({hasText:'测试分类'}).count()===1);
    await page.getByRole('button',{name:'删除测试分类',exact:true}).click();
    await categories.locator('#confirmDeleteExpenseBtn').click();
    await page.locator('#recordFrame').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'删除测试分类',exact:true}).waitFor({state:'detached'});
  }
  await page.screenshot({path:`water-demo-android/build/ui-check/categories-${width}.png`});
  assert(await categories.locator('body').evaluate(e=>getComputedStyle(e).getPropertyValue('--water-ink').trim())==='#234b40');
  await page.locator('#settingsPage').evaluate(e=>e.scrollTop=0);
  await page.mouse.move(12,height*.68);await page.mouse.down();
  await page.mouse.move(12,height*.93,{steps:10});await page.mouse.up();
  await page.waitForTimeout(700);
  assert(await page.locator('#settingsPage').getAttribute('aria-hidden')==='true','Swipe down must return home');
  await page.locator('#water').focus();await page.keyboard.press('ArrowUp');await page.waitForTimeout(700);
  await page.locator('#monthlyQuota').fill('16000');await page.locator('#saveQuota').click();
  await page.waitForTimeout(700);
  assert(await page.evaluate(()=>localStorage.getItem('water-monthly-quota'))==='16000');
  await page.locator('#water').click({position:{x:width/2,y:height/3}});
  assert(await page.locator('main > header').isVisible(),'Spending header must stay visible during expansion');
  const frame=page.frameLocator('#recordFrame');
  await frame.locator('#waterKeypad').waitFor({state:'visible'});
  await page.waitForTimeout(650);
  await page.screenshot({path:`water-demo-android/build/ui-check/quick-${width}.png`});
  assert(await frame.locator('.water-key-grid button').first().evaluate(e=>getComputedStyle(e).backgroundColor)!=='rgb(17, 17, 17)','Keypad must follow chosen theme');
  assert(await frame.locator('#waterKeypad').evaluate(e=>getComputedStyle(e).backgroundColor)==='rgb(35, 75, 64)','Keypad container must match the theme');
  const inspect=async(label)=>console.log(JSON.stringify({width,height,label,boxes:await frame.locator('body').evaluate(el=>{
   const result={};for(const s of ['.gauge-center','#waterKeypad','.record-head-content','#expenseAmountInput','.category-wheel','.record-action-dock','.record-status']){
    const e=el.querySelector(s),r=e.getBoundingClientRect();result[s]={x:r.x,y:r.y,w:r.width,h:r.height,visibility:getComputedStyle(e).visibility};
   }return result;
  })}));
  await inspect('quick');
  const amountBox=await frame.locator('.gauge-center').boundingBox();
  const keypadBox=await frame.locator('#waterKeypad').boundingBox();
  assert(amountBox.y+amountBox.height < keypadBox.y, 'Keypad overlaps amount');
  console.log('Cancel',await frame.locator('#waterQuickCancel').evaluate(e=>({rect:e.getBoundingClientRect().toJSON(),opacity:getComputedStyle(e).opacity,visibility:getComputedStyle(e).visibility})));
  for(const key of ['1','2','3'])await frame.locator(`[data-amount-key="${key}"]`).click();
  await frame.locator('#quickExpenseContinueBtn').click();
  await page.waitForTimeout(350);
  await inspect('record');
  const categoryBoxes=await frame.locator('.category-segment').evaluateAll(nodes=>nodes.map(e=>({label:e.textContent.trim(),...e.getBoundingClientRect().toJSON()})));
  assert(categoryBoxes.length===8,'Eight primary categories must be visible');
  for(let i=0;i<categoryBoxes.length;i++) {
    const a=categoryBoxes[i];assert(a.width>=44&&a.height>=44,'Category tap targets must stay usable');
    for(const b of categoryBoxes.slice(i+1))assert(Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)>=(a.width+b.width)/2,'Circular category buttons must not overlap');
  }
  await page.screenshot({path:`water-demo-android/build/ui-check/record-${width}.png`});
  const head=await frame.locator('.record-head-content').boundingBox();
  const ring=await frame.locator('.category-wheel').boundingBox();
  const dock=await frame.locator('.record-action-dock').boundingBox();
  assert(ring.width>200 && head.y+head.height < ring.y && ring.y+ring.height < dock.y, 'Record regions overlap');
  await frame.locator('#expenseAmountInput').click();
  await frame.locator('[data-amount-key="backspace"]').click();
  await frame.locator('[data-amount-key="4"]').click();
  assert(await frame.locator('#expenseAmountInput').inputValue()==='124');
  await frame.locator('#quickExpenseContinueBtn').click();
  await frame.locator('#waterKeypad').waitFor({state:'hidden'});
  assert(await frame.locator('#expenseAmountInput').evaluate(e=>e.readOnly));
  await page.evaluate(()=>localStorage.setItem('water-demo-records',JSON.stringify([{amount:32000,time:new Date().toISOString()}])));
  await page.reload();await page.waitForTimeout(150);
  await page.screenshot({path:`water-demo-android/build/ui-check/home-full-${width}.png`});
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
