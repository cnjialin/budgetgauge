const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('public/water-demo.html','utf8');
const source=html.slice(html.indexOf('  let waterStars ='),html.indexOf('  try { const saved=localStorage.getItem(\'water-ink\')'));
const env={gravityX:0,gravityY:1,monthlyLargeExpenseCount:0,width:390,height:844,COLOR:'#00105c',matchMedia:()=>({matches:false}),waterNormal:{x:0,y:1},tangentMin:0,tangentMax:390,waterOffset:600,settingsProgress:0,loginProgress:0,tiltVelocity:0,N:100,waveOffset:()=>0,impacts:[],sideX:195,sideY:600,sideProgress:0,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),ctx:{beginPath(){},moveTo(){},arc(){},lineTo(){},closePath(){},fill(){}}};
vm.createContext(env);vm.runInContext(source+'\nglobalThis.stars=()=>waterStars;globalThis.draw=drawWaterStars;',env);
env.draw(0);const original=env.stars().map(s=>({...s}));assert(original.length>4000);
env.settingsProgress=.2;env.draw(1/60);
const before=original[100],after=env.stars()[100];let shift=(after.y-before.y)*844;if(shift>422)shift-=844;if(shift< -422)shift+=844;
assert(Math.abs(shift+120)<2,'Settings rise carries the star material by the surface displacement');
// Compare particles just outside the moving edge and well beyond its reach.
env.settingsProgress=0;env.draw(0);
const cover=Math.hypot(195,600)+3;
env.sideProgress=80/cover;env.draw(0);
const near=env.stars()[0],far=env.stars()[1];
Object.assign(near,{x:195/390,y:700/844,edgeVX:0,edgeVY:0});
Object.assign(far,{x:195/390,y:820/844,edgeVX:0,edgeVY:0});
env.sideProgress=90/cover;env.draw(1/60);
assert(near.edgeVY>0,'Expanding edge pushes nearby water outward');
assert(Math.hypot(far.edgeVX,far.edgeVY)<Math.abs(near.edgeVY)*.01,'Far particles are essentially unaffected');
const speed=near.edgeVY;env.draw(1/60);
assert(near.edgeVY>0&&near.edgeVY<speed,'Stopping the edge leaves decaying inertia');
for(let i=0;i<60;i++)env.draw(1/60);
assert(Math.abs(near.edgeVY)<speed*.01,'Residual flow settles rather than stretching forever');
Object.assign(near,{x:195/390,y:700/844,edgeVX:0,edgeVY:0});
env.sideProgress=80/cover;env.draw(1/60);
assert(near.edgeVY<0,'Shrinking edge pulls nearby water back');
env.tiltVelocity=2;for(let i=0;i<120;i++)env.draw(1/60);
assert(env.stars().every(s=>Number.isFinite(s.paintX)&&Number.isFinite(s.paintY)));
console.log('PASS: page advection, local edge influence, fast distance falloff, inertia, return flow and finite positions');
// Isolate density diffusion: a dense patch must spread without creating/removing stars.
vm.runInContext(`waterStars=Array.from({length:1200},(_,i)=>({x:.5+Math.cos(i*2.39996)*(.015+.045*(i/1200)),y:.6+Math.sin(i*2.39996)*(.015+.045*(i/1200))}));globalThis.diffusionStep=()=>{updateStarDensity();for(const s of waterStars){diffuseStar(s);s.x+=s.diffuseX/60/width;s.y+=s.diffuseY/60/height;}};`,env);
const spread=()=>env.stars().reduce((sum,s)=>sum+((s.x-.5)*390)**2+((s.y-.6)*844)**2,0)/env.stars().length;
const spreadBefore=spread();for(let i=0;i<240;i++)env.diffusionStep();
assert(spread()>spreadBefore*1.1,'An overdense patch spreads gradually');
assert.equal(env.stars().length,1200);
assert(env.stars().every(s=>Math.hypot(s.diffuseX,s.diffuseY)<=4.001),'Diffusion stays weaker than gesture flow');
console.log('PASS: density diffusion spreads crowded particles, preserves count and caps drift at 4 px/s');

vm.runInContext('globalThis.syncStars=syncExpenseStars;',env);
env.monthlyLargeExpenseCount=2;env.syncStars();assert.equal(env.stars().filter(s=>s.expense).length,2);
env.syncStars();assert.equal(env.stars().filter(s=>s.expense).length,2,'Repeated sync does not duplicate stars');
env.monthlyLargeExpenseCount=1;env.syncStars();assert.equal(env.stars().filter(s=>s.expense).length,1);
env.monthlyLargeExpenseCount=0;env.syncStars();assert.equal(env.stars().filter(s=>s.expense).length,0);
console.log('PASS: expense star count adds, reconciles and removes without duplicates');
const month=new Date(),prior=new Date(month.getFullYear(),month.getMonth()-1,15);
let records=[1000,1000.01,2500,999.99].map(amount=>({amount,time:month.toISOString()}));records.push({amount:3000,time:prior.toISOString()});
const tally={monthAmount:{},ledgerOwner:'',localStorage:{getItem:()=>JSON.stringify(records)},monthlyLargeExpenseCount:0,waterStars:[],setMonthAmount(){},sendSideData(){},width:0};
vm.createContext(tally);vm.runInContext(html.slice(html.indexOf('  function updateMonthTotal('),html.indexOf('  const clamp =')),tally);
tally.updateMonthTotal();assert.equal(tally.monthlyLargeExpenseCount,2,'Only this month and strictly over 1000; 2500 is one star');
records[1].amount=1000;tally.updateMonthTotal();assert.equal(tally.monthlyLargeExpenseCount,1);
records=[];tally.updateMonthTotal();assert.equal(tally.monthlyLargeExpenseCount,0);
console.log('PASS: monthly threshold, edits and deleted records update the count');

env.monthlyLargeExpenseCount=1;env.syncStars();env.gravityX=1;env.gravityY=0;
for(let i=0;i<120;i++)env.draw(1/60);
const aligned=env.stars().find(s=>s.expense);
assert(Math.abs(Math.cos(aligned.angle))<.08,'Long axis aligns with sideways gravity');
const angleBefore=aligned.angle;env.gravityX=.01;env.gravityY=-1;env.draw(1/60);
assert(Math.abs(aligned.angle-angleBefore)<.1,'Rotation changes smoothly after gravity changes');
console.log('PASS: expense star gravity alignment and smooth rotation');

vm.runInContext('globalThis.spaceStars=updateExpenseStarSpacing;',env);
env.monthlyLargeExpenseCount=2;env.syncStars();
const pair=env.stars().filter(s=>s.expense);Object.assign(pair[0],{x:.5,y:.7});Object.assign(pair[1],{x:.51,y:.7});env.spaceStars();
assert(pair[0].spacingX<0&&pair[1].spacingX>0,'Nearby four-point stars repel one another');
pair[1].x=.9;env.spaceStars();assert.equal(pair[0].spacingX,0,'Distant four-point stars do not repel');
pair[1].x=.5;env.spaceStars();assert(Math.hypot(pair[0].spacingX,pair[0].spacingY)>0,'Exact overlap also separates');
assert(Math.hypot(pair[0].spacingX,pair[0].spacingY)<=5.001);
console.log('PASS: separate four-point star spacing, distant stability and overlap recovery');

// The white circle may cover particles: no hard displacement or position snap.
for(const star of env.stars())Object.assign(star,{x:.5,y:.7,radius:.5,speed:.8,edgeVX:0,edgeVY:0});
env.sideProgress=.45;env.draw(0);
assert(env.stars().every(s=>Math.abs(s.x-.5)<1e-9&&Math.abs(s.y-.7)<1e-9),'Growing the mask must not project particles to its edge');
env.sideProgress=0;env.draw(0);
assert(env.stars().every(s=>Math.abs(s.x-.5)<1e-9&&Math.abs(s.y-.7)<1e-9),'Closing the mask must not restore remembered positions');
console.log('PASS: circle occlusion without hard displacement or stored-position return');
