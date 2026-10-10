import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sidereal,horizontal,project,epochPosition,orientationMatrix,installSky,rotationQuaternion,interpolateRotation,SkyRenderer} from '../real-sky.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const time=Date.UTC(2000,0,1,12);
near(sidereal(time,0)*180/Math.PI,280.46061837);
const zenith=horizontal(1,.4,.4,1);near(zenith[0],0);near(zenith[1],0);near(zenith[2],1);
const east=horizontal(Math.PI/2,0,0,0);near(east[0],1);near(east[2],0);
const polar=horizontal(0,Math.PI/2,30*Math.PI/180,0);near(polar[2],.5);
const catalog=JSON.parse(fs.readFileSync('public/real-sky-catalog.json','utf8').replace(/^\uFEFF/,''));
assert(catalog.stars.length>15000);assert(catalog.stars.every(r=>r[2]<=7));
const sirius=catalog.stars.find(r=>r[2]<-1.4);assert(sirius);assert(Math.abs(sirius[0]-6.752)<.01);
const ep=epochPosition(sirius,time);near(ep[0],sirius[0]*15*Math.PI/180);near(ep[1],sirius[1]*Math.PI/180);
const up=[1,0,0,0,-1,0,0,0,-1];assert.deepEqual(project([0,0,1],up,0,390,844),[195,422]);
assert.equal(project([0,0,-1],up,0,390,844),null);
assert.deepEqual(project([0,0,-1],[1,0,0,0,1,0,0,0,1],0,390,844),[195,422],'Below-horizon bodies remain visible when looking down');
assert.deepEqual(project([0,0,1],orientationMatrix(0,180,0),0,390,844).map(Math.round),[195,422]);
// Cover all matrix-to-quaternion branches and landscape orientations.
for(const angles of [[0,0,0],[0,180,0],[90,30,40],[180,0,0],[270,-65,20]]) {
  const m=orientationMatrix(...angles),q=rotationQuaternion(m),reconstructed=interpolateRotation(new Float64Array(q),q,1);
  m.forEach((v,i)=>near(v,reconstructed[i]));
}
const start=rotationQuaternion(orientationMatrix(359,130,0)),end=rotationQuaternion(orientationMatrix(1,130,0));
const midpoint=interpolateRotation(start,end,.5),expected=orientationMatrix(0,130,0);
expected.forEach((v,i)=>near(v,midpoint[i]));
const evolving=rotationQuaternion(orientationMatrix(0,0,0)),destination=rotationQuaternion(orientationMatrix(90,135,20));
for(let i=0;i<120;i++) {
  const m=interpolateRotation(evolving,destination,1-Math.exp(-1/60/.018));
  for(let column=0;column<3;column++)near(m[column]**2+m[column+3]**2+m[column+6]**2,1);
}
// Cached horizontal rotation must match the original spherical calculation.
const renderer=new SkyRenderer(catalog.stars,time);
for(const [latitude,longitude] of [[0,0],[31.23,121.47],[-33.86,151.2],[89,-120]]) {
  renderer.update(time,latitude,longitude);
  for(let i=0;i<catalog.stars.length;i+=137) {
    const reference=horizontal(...epochPosition(catalog.stars[i],time),latitude*Math.PI/180,sidereal(time,longitude));
    reference.forEach((v,j)=>near(v,renderer.vectors[i*3+j]));
  }
}
let fills=0,positions=[];
const batchCtx={save(){},restore(){},beginPath(){},moveTo(){},arc(x,y){positions.push([x,y]);},fill(){fills++;}};
renderer.update(time,31.23,121.47);
const camera=orientationMatrix(30,145,10);
renderer.draw(batchCtx,camera,Math.PI/2,390,844);
const referencePositions=catalog.stars.map(row=>project(horizontal(...epochPosition(row,time),31.23*Math.PI/180,sidereal(time,121.47)),camera,Math.PI/2,390,844)).filter(Boolean);
const sort=items=>items.sort((a,b)=>a[0]-b[0]);sort(positions);sort(referencePositions);
assert.equal(positions.length,referencePositions.length);positions.forEach((p,i)=>{near(p[0],referencePositions[i][0]);near(p[1],referencePositions[i][1]);});
assert(fills<positions.length/5,'Batching substantially reduces canvas fills');
positions=[];
renderer.draw(batchCtx,[1,0,0,0,1,0,0,0,1],0,390,844);
assert(positions.length>100,'Looking below the horizon still renders actual stars');
assert(renderer.groups.every(g=>g.alpha>=.3),'Faint real stars have increased minimum brightness');
let parses=0,clockCalls=0,timers=new Map(),listener=new Map(),nativeCalls=[];
const nodes={};
for(const id of ['realSkyToggle','realSkyStatus','skyLatitude','skyLongitude','skyControls','skyDirection','skyApplyLocation','skyLocate'])nodes[id]={value:'',addEventListener(name,fn){this[name]=fn;}};
nodes.realSkyCatalog={get textContent(){parses++;return JSON.stringify(catalog);}};
globalThis.document={hidden:false,querySelector:s=>nodes[s.slice(1)],addEventListener:(n,f)=>listener.set(n,f)};
globalThis.window={WaterSensors:{isSkyAvailable:()=>true,setSkyEnabled:v=>nativeCalls.push(v),getSkyDeclination:()=>0,requestSkyLocation(){}}};
globalThis.screen={orientation:{angle:0}};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.addEventListener=(n,f)=>listener.set(n,f);globalThis.removeEventListener=n=>listener.delete(n);
globalThis.setTimeout=fn=>{timers.set(timers.size+1,fn);return timers.size;};globalThis.clearTimeout=id=>timers.delete(id);
installSky();assert.equal(parses,0,'Off does not parse the star catalog');
const oldNow=Date.now;Date.now=()=>{clockCalls++;return time;};
const ctx={save(){},restore(){},beginPath(){},moveTo(){},arc(){},fill(){}};
window.WaterRealSky.draw(ctx,390,844);assert.equal(clockCalls,0,'Off does not calculate');
nodes.realSkyToggle.checked=true;nodes.realSkyToggle.change();assert.equal(parses,1);assert(listener.has('watersky'));
listener.get('waterskylocation')({detail:{lat:30,lon:120}});
// Latest orientation is pulled by draw, with no intervening JS event required.
let pulls=0;
window.WaterSensors.getSkyRotation=()=>{pulls++;return JSON.stringify(up);};
window.WaterRealSky.draw(ctx,390,844);assert.equal(clockCalls,1);assert.equal(pulls,1);
listener.get('waterforeground')({detail:{active:false}});window.WaterRealSky.draw(ctx,390,844);assert.equal(clockCalls,1);assert(!listener.has('watersky'));
assert.equal(pulls,1,'Background does not pull sensors');
listener.get('waterforeground')({detail:{active:true}});assert(listener.has('watersky'));
nodes.realSkyToggle.checked=false;nodes.realSkyToggle.change();window.WaterRealSky.draw(ctx,390,844);assert.equal(clockCalls,1);assert(!listener.has('watersky'));assert.equal(nativeCalls.at(-1),false);
assert.equal(pulls,1,'Off does not pull sensors');
Date.now=oldNow;
console.log('PASS: real positions, cached projection equivalence, rotation continuity/orthogonality, batched fills, lazy catalog, off/background shutdown');
