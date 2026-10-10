import {GPUStarRenderer} from './sky-stars-gpu.js';
import {GalaxyRenderer} from './sky-galaxy.js';
import {project} from './sky-math.js';
import {brightLimbAngle,solarDiscRadius} from './sky-solar.js';
const COLORS={Sun:'#fff2d0',Moon:'#eef3ff',Mercury:'#d8e2ee',Venus:'#fff3d8',Mars:'#ffc1a1',Jupiter:'#fff2d2',Saturn:'#f8e0b4',Uranus:'#bde5f5',Neptune:'#adcaff'};
const VERTEX=`attribute vec2 position;attribute vec3 color;attribute vec4 style;attribute float opacity;
uniform float pixelRatio;varying vec3 tint;varying vec4 appearance;varying float alpha;varying float extent;
void main(){tint=color;appearance=style;alpha=opacity;extent=style.x+(style.y<.5?9.:style.x*.9);
gl_Position=vec4(position,0.,1.);gl_PointSize=2.*extent*pixelRatio;}`;
const FRAGMENT=`precision mediump float;
varying vec3 tint;varying vec4 appearance;varying float alpha;varying float extent;
void main(){
 vec2 p=(gl_PointCoord-.5)*2.*extent;float radius=appearance.x,d=length(p);
 float core=1.-smoothstep(radius-.45,radius+.45,d),a=core;
 if(appearance.y>1.5){
  float c=cos(appearance.w),s=sin(appearance.w);
  vec2 q=vec2(p.x*c+p.y*s,-p.x*s+p.y*c);
  float edge=-(2.*appearance.z-1.)*sqrt(max(0.,radius*radius-q.y*q.y));
  float lit=smoothstep(edge-.4,edge+.4,q.x);
  float halo=.08*sqrt(appearance.z)*exp(-pow(max(0.,d-radius)/(radius*.3),2.));
  a=core*(.09+.91*lit)+(1.-core)*halo;
 }else{
  float blur=appearance.y>.5?radius*.35:3.5;
  float strength=appearance.y>.5?.16:.22;
  float glow=strength*exp(-pow(max(0.,d-radius)/blur,2.));a=core+(1.-core)*glow;
 }
 a*=alpha;if(a<.002)discard;gl_FragColor=vec4(tint*a,a);
}`;

class GPUSolarLayer{
 constructor(surface){this.gl=surface.gl;this.data=new Float32Array(90);this.init();}
 init(){
  const gl=this.gl,compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  this.vertex=compile(gl.VERTEX_SHADER,VERTEX);this.fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT);this.program=gl.createProgram();
  gl.attachShader(this.program,this.vertex);gl.attachShader(this.program,this.fragment);gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,gl.DYNAMIC_DRAW);
  this.attributes=[['position',2,0],['color',3,8],['style',4,20],['opacity',1,36]].map(([name,size,offset])=>[gl.getAttribLocation(this.program,name),size,offset]);
  this.ratio=gl.getUniformLocation(this.program,'pixelRatio');
 }
 draw(solar,m,angle,width,height){
  if(!solar?.bodies.length||solar.bodies.length!==solar.vectors.length)return;
  let count=0;
  for(let i=0;i<solar.bodies.length;i++){
   const body=solar.bodies[i],v=solar.vectors[i],point=project(v,m,angle,width,height);if(!point)continue;
   const sun=body.body==='Sun',moon=body.body==='Moon',depth=-(v[0]*m[2]+v[1]*m[5]+v[2]*m[8]);
   const radius=sun||moon?solarDiscRadius(body.body,body.distance,width,height,depth)*12:3.5;
   const rgb=parseInt(COLORS[body.body].slice(1),16),rotation=moon?brightLimbAngle(v,solar.vectors[0],m,angle):0;
   this.data.set([point[0]*2/width-1,1-point[1]*2/height,((rgb>>16)&255)/255,((rgb>>8)&255)/255,(rgb&255)/255,
    radius,moon?2:sun?1:0,body.phase,rotation,sun||moon?1:Math.max(.65,Math.min(1,Math.pow(10,-.13*(body.magnitude-1))))],count++*10);
  }
  if(!count)return;
  const gl=this.gl;gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,count*10));
  for(let i=0;i<8;i++)gl.disableVertexAttribArray(i);
  for(const [attribute,size,offset]of this.attributes){gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,size,gl.FLOAT,false,40,offset);}
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1f(this.ratio,Math.min(2,globalThis.devicePixelRatio||1));
  gl.drawArrays(gl.POINTS,0,count);
 }
 dispose(){const gl=this.gl;gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);gl.deleteShader(this.vertex);gl.deleteShader(this.fragment);}
}

export class SkyGPUScene{
 constructor(){
  this.canvas=document.createElement('canvas');this.gl=this.canvas.getContext('webgl',{alpha:true,depth:false,stencil:false,antialias:false,premultipliedAlpha:true,powerPreference:'high-performance'});
  if(!this.gl)throw new Error('WebGL unavailable');this.disposed=false;
  this.onLost=e=>{e.preventDefault();this.lost=true;};
  // Lost-context objects have already been invalidated; do not delete them
  // against the restored context. Recreate the solar program lazily.
  this.onRestored=()=>{this.solar=null;this.lost=false;};
  this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
 }
 draw(ctx,m,angle,width,height,time,location,rows,starsEnabled,galaxyEnabled,solar,fallback){
  if(this.disposed||this.lost||this.gl.isContextLost())return false;
  const gl=this.gl,ratio=Math.min(2,globalThis.devicePixelRatio||1),w=Math.round(width*ratio),h=Math.round(height*ratio);
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  if(galaxyEnabled){if(!this.galaxy)this.galaxy=new GalaxyRenderer(this);this.galaxy.draw(null,m,angle,width,height,time,location.lat,location.lon);}
  else if(this.galaxy){this.galaxy.dispose();this.galaxy=null;}
  if(starsEnabled){
   if(!this.stars||time-this.epoch>86400000){this.stars?.dispose();this.stars=new GPUStarRenderer(rows,time,this);this.epoch=time;}
   this.stars.update(time,location.lat,location.lon);if(!this.stars.draw(null,m,angle,width,height))return false;
  }else{this.stars?.dispose();this.stars=null;fallback?.();}
  if(solar){if(!this.solar)this.solar=new GPUSolarLayer(this);this.solar.draw(solar,m,angle,width,height);}
  else if(this.solar){this.solar.dispose();this.solar=null;}
  ctx.drawImage(this.canvas,0,0,width,height);return true;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);
  this.stars?.dispose();this.galaxy?.dispose();this.solar?.dispose();this.gl.getExtension('WEBGL_lose_context')?.loseContext();this.canvas.width=this.canvas.height=1;
 }
}
