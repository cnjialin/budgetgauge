import {epochPosition,sidereal} from './sky-math.js';
const RAD=Math.PI/180;
const VERTEX=`
attribute vec3 equatorial;
attribute vec3 color;
attribute vec3 appearance;
uniform mat3 horizon;
uniform vec3 rightAxis,upAxis,forwardAxis;
uniform vec2 viewScale;
uniform float pixelRatio;
varying vec3 tint;
varying vec3 style;
varying float extent;
void main(){
 vec3 h=horizon*equatorial;
 float z=dot(h,forwardAxis);
 tint=color;style=appearance;
 extent=appearance.x+(appearance.z>.5?6.:.6);
 gl_PointSize=2.*extent*pixelRatio;
 if(z<=.02){gl_Position=vec4(3.,3.,0.,1.);return;}
 gl_Position=vec4(dot(h,rightAxis)*viewScale.x,dot(h,upAxis)*viewScale.y,0.,z);
}`;
const FRAGMENT=`precision mediump float;
varying vec3 tint;varying vec3 style;varying float extent;
void main(){
 float distance=length(gl_PointCoord-.5)*2.*extent;
 float core=1.-smoothstep(max(0.,style.x-.45),style.x+.45,distance);
 float glow=style.z>.5?.24*exp(-distance*distance/9.):0.;
 float alpha=style.y*(core+(1.-core)*glow);
 if(alpha<.002)discard;
 gl_FragColor=vec4(tint*alpha,alpha);
}`;

// Upload the catalogue once. Per-frame JS only sends camera uniforms, then
// draws all stars with one POINTS call; projection and soft glow stay on GPU.
export class GPUStarRenderer {
 constructor(rows,time,surface=null){
  this.canvas=surface?.canvas||document.createElement('canvas');this.shared=!!surface;this.rows=rows;this.epoch=time;
  this.disposed=false;this.lost=false;this.lastHorizontal=0;
  this.horizon=new Float32Array(9);
  this.gl=surface?.gl||this.canvas.getContext('webgl',{alpha:true,depth:false,stencil:false,antialias:false,premultipliedAlpha:true,powerPreference:'high-performance'});
  if(!this.gl)throw new Error('WebGL unavailable');
  this.data=new Float32Array(rows.length*9);
  rows.forEach((row,i)=>{
   const [ra,dec]=epochPosition(row,time),c=Math.cos(dec),mag=row[2]<2?row[2]:Math.round(row[2]*2)/2;
   const hex=row[3]===''?'e7eeff':Number(row[3])>.9?'ffdab1':Number(row[3])<.1?'c8dcff':'fff4df';
   const rgb=parseInt(hex,16),offset=i*9;
   this.data.set([c*Math.cos(ra),c*Math.sin(ra),Math.sin(dec),((rgb>>16)&255)/255,((rgb>>8)&255)/255,(rgb&255)/255,
    Math.max(.35,2.4*Math.pow(10,-.12*(mag+1.5))),Math.max(.3,Math.min(1,1.6*Math.pow(10,-.13*(mag-1)))),mag<2?1:0],offset);
  });
  try{this.init();}catch(error){this.dispose();throw error;}
  this.onLost=e=>{e.preventDefault();this.lost=true;};
  this.onRestored=()=>{if(!this.disposed){try{this.init();this.lost=false;}catch{this.lost=true;}}};
  this.canvas.addEventListener('webglcontextlost',this.onLost);
  this.canvas.addEventListener('webglcontextrestored',this.onRestored);
 }
 init(){
  const gl=this.gl;
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
  this.vertex=compile(gl.VERTEX_SHADER,VERTEX);this.fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT);
  this.program=gl.createProgram();gl.attachShader(this.program,this.vertex);gl.attachShader(this.program,this.fragment);gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  gl.useProgram(this.program);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.data,gl.STATIC_DRAW);
  this.attributes=[['equatorial',0],['color',12],['appearance',24]].map(([name,offset])=>[gl.getAttribLocation(this.program,name),offset]);
  this.uniforms={};for(const name of ['horizon','rightAxis','upAxis','forwardAxis','viewScale','pixelRatio'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
 }
 update(time,latitude,longitude){
  if(this.lastHorizontal&&time-this.lastHorizontal<1000&&latitude===this.latitude&&longitude===this.longitude)return;
  const lst=sidereal(time,longitude),c=Math.cos(lst),s=Math.sin(lst),cp=Math.cos(latitude*RAD),sp=Math.sin(latitude*RAD);
  this.horizon.set([-s,-sp*c,cp*c,c,-sp*s,cp*s,0,cp,sp]);
  this.lastHorizontal=time;this.latitude=latitude;this.longitude=longitude;
 }
 draw(ctx,m,angle,width,height){
  if(this.disposed||this.lost||this.gl.isContextLost())return false;
  const gl=this.gl,ratio=Math.min(2,globalThis.devicePixelRatio||1),w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;gl.viewport(0,0,w,h);}
  gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  for(let i=0;i<8;i++)gl.disableVertexAttribArray(i);
  for(const [attribute,offset]of this.attributes){gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,36,offset);}
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  const c=Math.cos(angle),s=Math.sin(angle),f=Math.min(width,height)/(2*Math.tan(55*RAD/2)),u=this.uniforms;
  gl.uniformMatrix3fv(u.horizon,false,this.horizon);
  gl.uniform3f(u.rightAxis,m[0]*c+m[1]*s,m[3]*c+m[4]*s,m[6]*c+m[7]*s);
  gl.uniform3f(u.upAxis,-m[0]*s+m[1]*c,-m[3]*s+m[4]*c,-m[6]*s+m[7]*c);
  gl.uniform3f(u.forwardAxis,-m[2],-m[5],-m[8]);gl.uniform2f(u.viewScale,2*f/width,2*f/height);gl.uniform1f(u.pixelRatio,ratio);
  if(!this.shared)gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.POINTS,0,this.rows.length);
  if(ctx)ctx.drawImage(this.canvas,0,0,width,height);return true;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  this.canvas.removeEventListener?.('webglcontextlost',this.onLost);this.canvas.removeEventListener?.('webglcontextrestored',this.onRestored);
  const gl=this.gl;if(gl){gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);gl.deleteShader(this.vertex);gl.deleteShader(this.fragment);if(!this.shared)gl.getExtension('WEBGL_lose_context')?.loseContext();}
  if(!this.shared)this.canvas.width=this.canvas.height=1;
 }
}
