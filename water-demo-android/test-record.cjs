const fs = require('fs'), vm = require('vm'), assert = require('assert');
const html = fs.readFileSync('public/water-demo.html', 'utf8').replace(/\r\n/g,'\n');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const editor = JSON.parse(html.match(/id="recordBundle" type="application\/json">([\s\S]*?)<\/script>/)[1]);
new vm.Script(editor.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert(editor.includes('id="categoryBackBtn"') && editor.includes('id="pickerHourWheel"'));
assert(editor.includes('id="quickExpenseContinueBtn"'));
assert(!/<(?:link|script)[^>]+(?:src|href)=/.test(editor), 'Editor must be self-contained');
const nodes = {}, events = {}, messages = [], store = new Map();
let frame, failSave = false, time = 0;
const ctx = new Proxy({}, {get:()=>()=>{},set:()=>true});
for(const id of ['main','#water','#entryDisk','#count','#caption','#status','#motion','#tilt','#reset','#recordFrame','#recordBundle','#monthAmount','#settingsPage','#monthlyQuota','#quotaStatus']) {
  nodes[id] = {textContent:'',style:{},hidden:true,handlers:{},classList:{add(){},remove(){}},
    querySelectorAll(){return [];},getContext:()=>ctx,blur(){},setAttribute(){},addEventListener(n,f){this.handlers[n]=f;}};
}
nodes['#recordBundle'].textContent = JSON.stringify(editor);
nodes['#recordFrame'].contentWindow = {postMessage:message=>messages.push(message)};
const env = {document:{hidden:false,querySelector:id=>nodes[id],addEventListener(){}},matchMedia:()=>({matches:false}),
  innerWidth:390,innerHeight:844,devicePixelRatio:1,requestAnimationFrame:f=>frame=f,
  addEventListener:(n,f)=>events[n]=f,removeEventListener(){},setTimeout:()=>1,clearTimeout(){},
  localStorage:{getItem:k=>store.get(k)||null,setItem(k,v){if(failSave)throw Error('Storage unavailable');store.set(k,v);}}};
env.window=env;
const today = new Date(), previousMonth = new Date(today.getFullYear(), today.getMonth()-1, 15);
store.set('water-demo-records',JSON.stringify([{amount:12.3,time:today.toISOString()},{amount:.2,time:today.toISOString()},{amount:99,time:previousMonth.toISOString()}]));
vm.runInNewContext(source.replace('  requestAnimationFrame(frame);\n})();',
  '  requestAnimationFrame(frame);\n globalThis.amountProbe=()=>monthAmountMotion;globalThis.settingsTest={open:openSettings,close:closeSettings};globalThis.probe=()=>({settingsProgress,state:entry.state,count,drops:drops.length,target,base,monthlyQuota});\n})();'),env);
assert(nodes['#monthAmount'].textContent==='¥12.50','Monthly total must exclude other months and sum cents');
assert(env.probe().monthlyQuota===8000);
assert(Math.abs(env.probe().base-844*(1-12.5/8000))<.001,'Water volume must match spending divided by quota');
store.set('water-demo-records',JSON.stringify([{amount:4000,time:today.toISOString()}]));events.focus();
assert(env.probe().target===422,'Half the quota must fill half the screen');
const tick=n=>{for(let i=0;i<n;i++)frame(time+=1000/60);};
store.clear(); events.focus();tick(100);assert(nodes['#monthAmount'].textContent==='¥0.00');
tick(2);env.settingsTest.open();tick(17);const entered=env.probe().settingsProgress;
tick(40);env.settingsTest.close();tick(17);
assert(Math.abs(env.probe().settingsProgress-(1-entered))<.001,'Entering and leaving must use identical easing and duration');
tick(40);
const send=(action,record)=>events.message({source:nodes['#recordFrame'].contentWindow,data:{channel:'water-editor',action,record}});
const open=()=>{const before=messages.filter(m=>m.action==='open').length;nodes['#water'].handlers.click();assert(messages.filter(m=>m.action==='open').length===before+1,'Editor must prepare at expansion start');tick(40);assert(env.probe().state==='black');assert(!nodes['#recordFrame'].hidden);};
send('ready');open();
assert(env.waterBack()===true);tick(40);assert(env.probe().state==='water'&&env.probe().drops===0,'System Back must cancel without a drop');
assert(env.waterBack()===false,'Home returns control to Android');
env.settingsTest.open();tick(40);assert(env.waterBack()===true);tick(40);assert(env.probe().settingsProgress===0);
open();
nodes['#water'].handlers.click();assert(env.probe().state==='black','Background must not dismiss editor');
let cancelFrames, cancelAnimation;
nodes['#entryDisk'].animate = frames => {cancelFrames=frames;return cancelAnimation={cancel(){}};};
send('cancel');
assert(cancelFrames.at(-1).transform==='scale(0)', 'Cancel must shrink fully to zero');
cancelAnimation.onfinish();
delete nodes['#entryDisk'].animate;
tick(40);assert(env.probe().count===0&&env.probe().drops===0,'Cancel must not emit a drop');
open();
const record={amount:28.5,category:['餐饮','午餐','炒菜'],purpose:'餐饮 午餐 炒菜',time:'2026-09-26T04:30:00.000Z'};
failSave=true;send('save',record);assert(env.probe().state==='black'&&messages.at(-1).error);
failSave=false;send('save',record);assert(env.probe().state==='shrinking');
send('save',record);assert(JSON.parse(store.get('water-demo-records')).length===1,'Duplicate save must not duplicate records');
assert(nodes['#monthAmount'].textContent==='¥0.00','Amount waits until closing circle reveals home');
tick(42);
assert(env.amountProbe()?.elapsed>0,'Digit reels must start after the closing circle');
tick(180);assert(env.probe().count===1,'Successful save emits exactly one drop');
assert(nodes['#monthAmount'].textContent==='¥28.50','Animation must finish at the exact cent total');
assert(store.size===1,'Must not write original ledger keys');

// Exercise the original category selection and confirmation functions, not copies.
const original=fs.readFileSync('script.js','utf8');
function extract(name){const start=original.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0);const tail=original.slice(start);const next=tail.slice(1).search(/\n(?:async )?function /);return next<0?tail:tail.slice(0,next+1);}
const keys = {isQuickExpenseMode:true,isExpenseMode:false,remainingBudgetEl:{textContent:'',style:{}},
 expenseAmountInput:{value:'',style:{}},quickExpenseContinueBtn:{},document:{body:{classList:{contains:()=>true}}}};
vm.createContext(keys);vm.runInContext(extract('syncWaterAmountSize'),keys);
vm.createContext(keys);vm.runInContext(extract('handleWaterAmountKey'),keys);
for(const key of ['.','5','.','6','7']) keys.handleWaterAmountKey(key);
assert(keys.remainingBudgetEl.textContent==='0.56');
keys.handleWaterAmountKey('backspace');assert(keys.remainingBudgetEl.textContent==='0.5');
for(let i=0;i<3;i++)keys.handleWaterAmountKey('backspace');
assert(keys.quickExpenseContinueBtn.disabled);
for(const key of ['0','0','2'])keys.handleWaterAmountKey(key);
assert(keys.remainingBudgetEl.textContent==='2');
keys.isExpenseMode=true;keys.isQuickExpenseMode=false;
for(const key of ['1','.','2'])keys.handleWaterAmountKey(key);
assert(keys.expenseAmountInput.value==='1.2');
assert((editor.match(/data-amount-key=/g)||[]).length===12);
console.log('PASS: keypad decimal precision, deletion, zero normalization and editing');
const api={isWaterRecordView:true,isWaterPageView:false,waterSavePending:false,currentCategoryPath:[],selectedCategoryPath:[],
 currentCategoryDepth:0,selectedPurpose:'',expensePurposeInput:{value:''},expenseAmountInput:{value:'28.5',focus(){}},
 expenseStatus:{textContent:''},expenseDateTimeTrigger:{focus(){}},selectedExpenseDateTime:new Date(record.time),
 confirmExpenseBtn:{},cancelExpenseBtn:{},renderCategoryWheel(){},updatePurposeChips(){},
 notifyWaterEditor(action,value){this.lastSave={action,value};},sanitizeNumber:Number};
api.notifyWaterEditor=(action,value)=>{api.lastSave={action,value};};
vm.createContext(api);
for(const fn of ['getCategoryChildren','formatCategoryPathInput','selectCategoryNode','resolvePurpose','resolvePurposeList','serializeTimestamp','confirmExpense'])vm.runInContext(extract(fn),api);
api.selectCategoryNode({label:'餐饮',children:[{label:'午餐'}]});
api.selectCategoryNode({label:'午餐',children:[{label:'炒菜'}]});
api.selectCategoryNode({label:'炒菜'});
assert(api.expensePurposeInput.value==='餐饮/午餐/炒菜/');
(async()=>{await api.confirmExpense();assert(api.lastSave.action==='save'&&api.lastSave.value.amount===28.5);assert(api.lastSave.value.time===record.time);assert(api.lastSave.value.category.length===3);console.log('PASS: original 3-level category + confirm; editor open/cancel/save failure/save success; isolated storage; standalone bundle.');})().catch(e=>{console.error(e);process.exitCode=1;});
