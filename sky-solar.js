import {horizontal,sidereal,project} from './sky-math.js';
const RAD=Math.PI/180;
const COLORS={Mercury:'#d8e2ee',Venus:'#fff3d8',Mars:'#ffc1a1',Jupiter:'#fff2d2',Saturn:'#f8e0b4',Uranus:'#bde5f5',Neptune:'#adcaff'};
const AU_KM=149597870.7;
export function solarDiscRadius(body,distance,width,height,depth=1) {
  const radiusKm=body==='Sun'?695700:1737.4;
  const angularRadius=Math.asin(Math.min(1,radiusKm/(distance*AU_KM)));
  const focal=Math.min(width,height)/(2*Math.tan(55*RAD/2));
  return focal*Math.tan(angularRadius)/depth;
}

export function brightLimbAngle(moon,sun,m,angle) {
  const c=Math.cos(angle),s=Math.sin(angle);
  const right=[m[0]*c+m[1]*s,m[3]*c+m[4]*s,m[6]*c+m[7]*s];
  const up=[-m[0]*s+m[1]*c,-m[3]*s+m[4]*c,-m[6]*s+m[7]*c],forward=[-m[2],-m[5],-m[8]];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const tangent=sun.map((v,i)=>v-dot(moon,sun)*moon[i]);
  const z=dot(moon,forward),x=dot(moon,right),y=dot(moon,up),tz=dot(tangent,forward);
  return Math.atan2(-(dot(tangent,up)*z-y*tz),dot(tangent,right)*z-x*tz);
}

export function makeMoonSprite(fraction) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),r=48,cos=2*Math.max(0,Math.min(1,fraction))-1;
  ctx.translate(64,64);ctx.fillStyle='#cdd8eb';ctx.globalAlpha=.09;
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#eef3ff';ctx.beginPath();ctx.moveTo(0,-r);
  ctx.arc(0,0,r,-Math.PI/2,Math.PI/2);
  for(let y=r;y>=-r;y-=.25)ctx.lineTo(-cos*Math.sqrt(Math.max(0,r*r-y*y)),y);
  ctx.closePath();ctx.fill();
  return canvas;
}

export class SolarRenderer {
  constructor() {
    const source=JSON.parse(document.querySelector('#solarWorkerSource').textContent);
    this.url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    this.worker=new Worker(this.url);
    this.bodies=[];this.vectors=[];this.lastRequest=0;this.lastHorizontal=0;this.sequence=0;this.pending=false;this.disposed=false;
    this.worker.onmessage=event=>{
      if(this.disposed||event.data.id!==this.sequence)return;
      this.pending=false;
      if(event.data.error)return;
      this.bodies=event.data.bodies;this.lastHorizontal=0;
      const moon=this.bodies.find(body=>body.body==='Moon');this.moonSprite=makeMoonSprite(moon.phase);
    };
    this.worker.onerror=()=>{this.pending=false;};
  }
  update(time,latitude,longitude) {
    const changed=latitude!==this.latitude||longitude!==this.longitude;
    if(changed||(!this.pending&&time-this.lastRequest>=30000)){
      this.latitude=latitude;this.longitude=longitude;this.pending=true;this.lastRequest=time;
      this.worker.postMessage({id:++this.sequence,time,latitude,longitude});
    }
    if(this.lastHorizontal&&time-this.lastHorizontal<1000&&!changed)return;
    const lst=sidereal(time,longitude);
    this.vectors=this.bodies.map(body=>horizontal(body.ra,body.dec,latitude*RAD,lst));this.lastHorizontal=time;
  }
  draw(ctx,m,angle,width,height) {
    if(!this.bodies.length||this.vectors.length!==this.bodies.length)return;
    ctx.save();
    for(let i=0;i<this.bodies.length;i++){
      const body=this.bodies[i],point=project(this.vectors[i],m,angle,width,height);if(!point)continue;
      const [x,y]=point;
      const sun=body.body==='Sun',moon=body.body==='Moon';
      const vector=this.vectors[i],depth=-(vector[0]*m[2]+vector[1]*m[5]+vector[2]*m[8]);
      // Enlarge the discs for readable phases while retaining distance variation.
      const r=(sun||moon)?solarDiscRadius(body.body,body.distance,width,height,depth)*12:3.5;
      if(body.body==='Moon') {
        ctx.save();ctx.translate(x,y);ctx.rotate(brightLimbAngle(this.vectors[i],this.vectors[0],m,angle));
        const size=r*128/48;
        ctx.drawImage(this.moonSprite,-size/2,-size/2,size,size);ctx.restore();continue;
      }
      ctx.globalAlpha=sun?1:Math.max(.65,Math.min(1,Math.pow(10,-.13*(body.magnitude-1))));
      ctx.fillStyle=sun?'#fff2d0':COLORS[body.body];ctx.shadowColor=ctx.fillStyle;
      ctx.shadowBlur=sun?r*1.2:7;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }
    ctx.restore();
  }
  dispose() {this.disposed=true;this.worker.terminate();URL.revokeObjectURL(this.url);this.bodies=[];this.vectors=[];}
}
