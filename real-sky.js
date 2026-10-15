import {sidereal,horizontal,project,epochPosition,orientationMatrix,rotationQuaternion,interpolateRotation} from './sky-math.js';
export {sidereal,horizontal,project,epochPosition,orientationMatrix,rotationQuaternion,interpolateRotation} from './sky-math.js';
import {SolarRenderer} from './sky-solar.js';
import {GalaxyRenderer} from './sky-galaxy.js';
import {GPUStarRenderer} from './sky-stars-gpu.js';
import {SkyGPUScene} from './sky-gpu-scene.js';
import {SkyCanvasComposite} from './sky-canvas-composite.js';
const RAD=Math.PI/180;
const starColor=bv=>bv===''?'#e7eeff':Number(bv)>.9?'#ffdab1':Number(bv)<.1?'#c8dcff':'#fff4df';
const starRadius=mag=>Math.max(.35,2.4*Math.pow(10,-.12*(mag+1.5)));
const starAlpha=mag=>Math.max(.3,Math.min(1,1.6*Math.pow(10,-.13*(mag-1))));
export class SkyRenderer {
  constructor(rows,time) {
    this.equatorial=new Float64Array(rows.length*3);
    this.vectors=new Float64Array(rows.length*3);
    this.groups=[];
    const groups=new Map();
    rows.forEach((row,i)=>{
      const [ra,dec]=epochPosition(row,time),c=Math.cos(dec),base=i*3;
      this.equatorial[base]=c*Math.cos(ra);this.equatorial[base+1]=c*Math.sin(ra);this.equatorial[base+2]=Math.sin(dec);
      const mag=row[2]<2?row[2]:Math.round(row[2]*2)/2,color=starColor(row[3]),key=`${color}:${mag}`;
      if(!groups.has(key))groups.set(key,{color,radius:starRadius(mag),alpha:starAlpha(mag),bright:mag<2,indices:[]});
      groups.get(key).indices.push(base);
    });
    this.groups=[...groups.values()];
    this.lastHorizontal=0;this.latitude=null;this.longitude=null;
  }
  update(time,latitude,longitude) {
    if(this.lastHorizontal&&time-this.lastHorizontal<1000&&this.latitude===latitude&&this.longitude===longitude)return;
    const lst=sidereal(time,longitude),c=Math.cos(lst),s=Math.sin(lst),cp=Math.cos(latitude*RAD),sp=Math.sin(latitude*RAD);
    const e=this.equatorial,v=this.vectors;
    for(let i=0;i<e.length;i+=3){const meridian=e[i]*c+e[i+1]*s;v[i]=e[i+1]*c-e[i]*s;v[i+1]=e[i+2]*cp-meridian*sp;v[i+2]=e[i+2]*sp+meridian*cp;}
    this.lastHorizontal=time;this.latitude=latitude;this.longitude=longitude;
  }
  draw(ctx,m,angle,width,height) {
    const c=Math.cos(angle),s=Math.sin(angle),f=Math.min(width,height)/(2*Math.tan(55*RAD/2)),cx=width/2,cy=height/2;
    const x0=m[0]*c+m[1]*s,x1=m[3]*c+m[4]*s,x2=m[6]*c+m[7]*s;
    const y0=-m[0]*s+m[1]*c,y1=-m[3]*s+m[4]*c,y2=-m[6]*s+m[7]*c,v=this.vectors;
    ctx.save();ctx.shadowBlur=0;
    for(const group of this.groups){
      ctx.fillStyle=group.color;ctx.globalAlpha=group.alpha;ctx.beginPath();let visible=0;
      for(const i of group.indices){
        const up=v[i+2];
        const east=v[i],north=v[i+1],z=-(east*m[2]+north*m[5]+up*m[8]);if(z<=.02)continue;
        const x=cx+f*(east*x0+north*x1+up*x2)/z,y=cy-f*(east*y0+north*y1+up*y2)/z;
        if(x< -10||x>width+10||y< -10||y>height+10)continue;
        visible++;ctx.moveTo(x+group.radius,y);ctx.arc(x,y,group.radius,0,Math.PI*2);
      }
      // Compatibility fallback only; normal rendering uses soft GPU glow.
      if(visible){if(group.bright){ctx.shadowColor=group.color;ctx.shadowBlur=6;}ctx.fill();ctx.shadowBlur=0;}
    }
    ctx.restore();
  }
}

export function installSky() {
  const toggle=document.querySelector('#realSkyToggle'),note=document.querySelector('#realSkyStatus');
  const simulatedToggle=document.querySelector('#simulatedSkyToggle');
  const solarToggle=document.querySelector('#solarSkyToggle'),galaxyToggle=document.querySelector('#galaxySkyToggle');
  const outsideToggle=document.querySelector('#outsideSkyToggle');
  const native=window.WaterSensors;
  let enabled=false,active=false,rows=null,renderer=null,fallbackRenderer=null,matrix=null,nativeMatrix=false;
  let simulatedEnabled=false;
  let outsideEnabled=true;
  let solarEnabled=false,galaxyEnabled=false,solar=null,galaxy=null,galaxyUnavailable=false,solarUnavailable=false;
  let gpuScene=null,gpuUnavailable=false;
  let canvasComposite=null,simulatedComposite=null;
  const wanted=()=>enabled||solarEnabled||galaxyEnabled;
  let rotation=null,targetRotation=null,lastDraw=0;
  let lastSnapshot='';
  const smoothedMatrix=new Float64Array(9),correctedMatrix=new Float64Array(9);
  let location=null,declination=0,lastEpoch=0,watch=null,generation=0,sensorTimeout=0;
  let foreground=!document.hidden,orientationPermission=false;
  const say=text=>{if(note.textContent!==text){note.textContent=text;toggle.title=text;}};
  try { const saved=JSON.parse(localStorage.getItem('water-sky-location'));if(saved&&Number.isFinite(saved.lat)&&Math.abs(saved.lat)<=90&&Number.isFinite(saved.lon)&&Math.abs(saved.lon)<=180)location=saved; } catch {}
  function setLocation(latitude,longitude) {
    if(!wanted())return;
    if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180){say('请输入有效经纬度');return;}
    location={lat:latitude,lon:longitude};
    try{localStorage.setItem('water-sky-location',JSON.stringify(location));}catch{}
    declination=native?.getSkyDeclination?.(latitude,longitude)||0;
    say(matrix?'已按当前位置和时间显示 · 转动手机查看天空':'位置已设置 · 等待方向感应，远离磁性物体');
  }
  function receive(event) {
    if(!active)return;
    if(event.type==='watersky') {
      if(!Array.isArray(event.detail.matrix)||event.detail.matrix.length!==9||!event.detail.matrix.every(Number.isFinite))return;
      matrix=event.detail.matrix;nativeMatrix=true;
    } else {
      if(!Number.isFinite(event.alpha)||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
      if(!event.absolute&&!Number.isFinite(event.webkitCompassHeading))return;
      matrix=orientationMatrix(Number.isFinite(event.webkitCompassHeading)?-event.webkitCompassHeading:event.alpha,event.beta,event.gamma);nativeMatrix=false;
    }
    targetRotation=rotationQuaternion(matrix);
    if(!rotation)rotation=new Float64Array(targetRotation);
    clearTimeout(sensorTimeout);
    say(location?'真实星空已开启 · 转动手机查看，远离磁性物体':'正在获取位置');
  }
  function stop() {
    active=false;generation++;matrix=null;rotation=targetRotation=null;lastDraw=0;lastSnapshot='';clearTimeout(sensorTimeout);
    removeEventListener('watersky',receive);removeEventListener('deviceorientationabsolute',receive);removeEventListener('deviceorientation',receive);
    native?.setSkyEnabled?.(false);
    if(watch!==null){navigator.geolocation?.clearWatch(watch);watch=null;}
    renderer?.dispose?.();renderer=null;fallbackRenderer=null;lastEpoch=0;
    gpuScene?.dispose();gpuScene=null;gpuUnavailable=false;
    canvasComposite?.dispose();canvasComposite=null;
    solar?.dispose();solar=null;galaxy?.dispose();galaxy=null;galaxyUnavailable=solarUnavailable=false;
  }
  function start() {
    if(!wanted()||!foreground||active)return;
    active=true;
    if(enabled&&!rows)rows=JSON.parse(document.querySelector('#realSkyCatalog').textContent).stars;
    if(native?.setSkyEnabled) {
      if(!native.isSkyAvailable()){say('设备缺少方向传感器，无法追踪真实天空');return;}
      addEventListener('watersky',receive);native.setSkyEnabled(true);
    } else {
      if(typeof window.DeviceOrientationEvent?.requestPermission==='function'&&!orientationPermission){say('请重新开启以授权方向感应');return;}
      addEventListener('deviceorientationabsolute',receive);addEventListener('deviceorientation',receive);
    }
    locate();
    if(location)declination=native?.getSkyDeclination?.(location.lat,location.lon)||0;
    say(location?'等待方向感应 · 请竖起手机':'正在获取位置');
    sensorTimeout=setTimeout(()=>{if(active&&!matrix)say('未收到方向，请重新开启或检查手机传感器');},8000);
  }
  async function permission() {
    if(!wanted())return;
    const token=generation;
    try {if(typeof window.DeviceOrientationEvent?.requestPermission==='function') {
      const result=await DeviceOrientationEvent.requestPermission(true);
      if(token!==generation||!wanted())return;
      if(result!=='granted'){say('未获得方向权限，请重新开启');return;}
      orientationPermission=true;
    } stop();start();}catch{say('无法获得方向权限，请通过 HTTPS 打开');}
  }
  function setEnabled(value,gesture=false) {
    if(value)setSimulated(false);
    enabled=value;toggle.checked=value;
    try{localStorage.setItem('water-real-sky',value?'1':'0');}catch{}
    if(!value){renderer?.dispose?.();renderer=null;fallbackRenderer=null;lastEpoch=0;}
    reconcile(gesture);
  }
  function setSimulated(value) {
    simulatedEnabled=value;if(simulatedToggle)simulatedToggle.checked=value;
    try{localStorage.setItem('water-simulated-sky',value?'1':'0');}catch{}
    if(value&&enabled)setEnabled(false);
  }
  function reconcile(gesture=false) {
    if(!wanted()){stop();say('关闭时不计算星图、不监听方向');return;}
    if(!active){if(gesture)permission();else start();}
  }
  toggle.addEventListener('change',()=>setEnabled(toggle.checked,true));
  simulatedToggle?.addEventListener('change',()=>setSimulated(simulatedToggle.checked));
  outsideToggle?.addEventListener('change',()=>{
    outsideEnabled=outsideToggle.checked;
    try{localStorage.setItem('water-outside-sky',outsideEnabled?'1':'0');}catch{}
  });
  solarToggle?.addEventListener('change',()=>{
    solarEnabled=solarToggle.checked;
    try{localStorage.setItem('water-solar-sky',solarEnabled?'1':'0');}catch{}
    if(!solarEnabled){solar?.dispose();solar=null;}solarUnavailable=false;reconcile(true);
  });
  galaxyToggle?.addEventListener('change',()=>{
    galaxyEnabled=galaxyToggle.checked;
    try{localStorage.setItem('water-galaxy-sky',galaxyEnabled?'1':'0');}catch{}
    if(!galaxyEnabled){galaxy?.dispose();galaxy=null;}galaxyUnavailable=false;reconcile(true);
  });
  function locate() {
    if(!wanted()||!active)return;
    if(native?.requestSkyLocation){native.requestSkyLocation();return;}
    if(!navigator.geolocation){say('无法定位，请检查位置权限');return;}
    const token=generation;
    if(watch!==null)navigator.geolocation.clearWatch(watch);
    watch=navigator.geolocation.watchPosition(p=>{if(token!==generation||!active)return;setLocation(p.coords.latitude,p.coords.longitude);navigator.geolocation.clearWatch(watch);watch=null;},()=>{
      if(token!==generation||!active)return;navigator.geolocation.clearWatch(watch);watch=null;say('无法定位，请检查位置权限');
    },{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
  }
  addEventListener('waterskylocation',e=>{if(!active)return;if(e.detail.error)say('无法定位，请检查位置权限');else setLocation(e.detail.lat,e.detail.lon);});
  const visibility=()=>{foreground=!document.hidden;if(!foreground)stop();else start();};
  document.addEventListener('visibilitychange',visibility);
  addEventListener('waterforeground',e=>{foreground=e.detail.active;if(foreground)start();else stop();});
  window.WaterRealSky={get enabled(){return wanted();},get starsEnabled(){return enabled;},
    drawSimulated(ctx,width,height,paint,waterPoints,outsideColor){
      if(!simulatedComposite)simulatedComposite=new SkyCanvasComposite();
      paint(simulatedComposite.begin(width,height));
      simulatedComposite.finish(ctx,waterPoints,width,height,outsideColor);
    },
    get simulatedEnabled(){return simulatedEnabled;},
    get outsideEnabled(){return outsideEnabled;},
    get solarEnabled(){return solarEnabled;},get galaxyEnabled(){return galaxyEnabled;},draw(ctx,width,height,fallback,waterPoints,outsideColor){
    if(!active||!location){if(!enabled)fallback?.();return;}
    // Pull at the moment of drawing: native push messages can be a frame late.
    if(native?.getSkyRotation){
      const snapshot=native.getSkyRotation();
      if(snapshot&&snapshot!==lastSnapshot){
        try{receive({type:'watersky',detail:{matrix:JSON.parse(snapshot)}});lastSnapshot=snapshot;}catch{}
      }
    }
    if(!matrix){if(!enabled)fallback?.();return;}
    const now=Date.now();
    const frameTime=performance.now(),dt=lastDraw?Math.min(.05,(frameTime-lastDraw)/1000):1/60;lastDraw=frameTime;
    let m=interpolateRotation(rotation,targetRotation,1-Math.exp(-dt/.008),smoothedMatrix);
    if(nativeMatrix&&declination){const c=Math.cos(declination*RAD),s=Math.sin(declination*RAD);correctedMatrix.set(m);for(let i=0;i<3;i++){correctedMatrix[i]=c*m[i]+s*m[i+3];correctedMatrix[i+3]=-s*m[i]+c*m[i+3];}m=correctedMatrix;}
    const angle=(screen.orientation?.angle??window.orientation??0)*RAD;
    if(solarEnabled&&!solarUnavailable){
      try{if(!solar)solar=new SolarRenderer();solar.update(now,location.lat,location.lon);}
      catch{solarUnavailable=true;solar?.dispose();solar=null;}
    }
    if(!gpuUnavailable){
      try{
        if(!gpuScene)gpuScene=new SkyGPUScene();
        if(gpuScene.draw(ctx,m,angle,width,height,now,location,rows,enabled,galaxyEnabled,solarEnabled?solar:null,fallback,waterPoints,outsideColor))return;
      }catch{gpuScene?.dispose();gpuScene=null;gpuUnavailable=true;}
    }
    const outputCtx=ctx;
    if(waterPoints){if(!canvasComposite)canvasComposite=new SkyCanvasComposite();ctx=canvasComposite.begin(width,height);}
    if(galaxyEnabled&&!galaxyUnavailable){
      try{if(!galaxy)galaxy=new GalaxyRenderer();galaxy.draw(ctx,m,angle,width,height,now,location.lat,location.lon);}
      catch{galaxyUnavailable=true;galaxy?.dispose();galaxy=null;galaxyToggle.title='当前设备暂时无法绘制银河光带';}
    }
    if(enabled){
      if(!rows)rows=JSON.parse(document.querySelector('#realSkyCatalog').textContent).stars;
      if(!renderer||now-lastEpoch>86400000){
        renderer?.dispose?.();fallbackRenderer=null;
        try{renderer=new GPUStarRenderer(rows,now);}catch{renderer=new SkyRenderer(rows,now);}
        lastEpoch=now;
      }
      renderer.update(now,location.lat,location.lon);
      if(renderer.draw(ctx,m,angle,width,height)===false){
        if(!fallbackRenderer)fallbackRenderer=new SkyRenderer(rows,now);
        fallbackRenderer.update(now,location.lat,location.lon);fallbackRenderer.draw(ctx,m,angle,width,height);
      }
    }else fallback?.();
    if(solarEnabled&&!solarUnavailable){
      try{if(!solar)solar=new SolarRenderer();solar.update(now,location.lat,location.lon);solar.draw(ctx,m,angle,width,height);}
      catch{solarUnavailable=true;solar?.dispose();solar=null;solarToggle.title='当前设备暂时无法计算日月行星';}
    }
    if(waterPoints)canvasComposite.finish(outputCtx,waterPoints,width,height,outsideColor);
  }};
  try{
    outsideEnabled=localStorage.getItem('water-outside-sky')!=='0';if(outsideToggle)outsideToggle.checked=outsideEnabled;
    solarEnabled=localStorage.getItem('water-solar-sky')==='1';galaxyEnabled=localStorage.getItem('water-galaxy-sky')==='1';
    if(solarToggle)solarToggle.checked=solarEnabled;if(galaxyToggle)galaxyToggle.checked=galaxyEnabled;
  }catch{}
  try{
    const real=localStorage.getItem('water-real-sky')==='1',saved=localStorage.getItem('water-simulated-sky');
    // Preserve the old effect once on upgrade; color changes never affect it.
    setSimulated(!real&&(saved===null?(localStorage.getItem('water-ink')||'').toLowerCase()==='#00105c':saved==='1'));
    setEnabled(real);
  }catch{setEnabled(false);setSimulated(false);}
}
if(typeof window!=='undefined'&&document.querySelector('#realSkyToggle'))installSky();
