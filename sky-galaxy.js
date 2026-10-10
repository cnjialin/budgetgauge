import {sidereal,epochPosition} from './sky-math.js';
const RAD=Math.PI/180;
// IAU galactic coordinates in the J2000 equatorial frame.
const GAL=[[-.0548755604,-.8734370902,-.4838350155],[.4941094279,-.4448296300,.7469822445],[-.8676661490,-.1980763734,.4559837762]];

export function horizonToGalactic(time,latitude,longitude) {
  const bases=[[0,0],[6,0],[0,90]].map(([ra,dec])=>{
    const [a,d]=epochPosition([ra,dec,0,'',0,0],time);return [Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)];
  });
  const lst=sidereal(time,longitude),c=Math.cos(lst),s=Math.sin(lst),cp=Math.cos(latitude*RAD),sp=Math.sin(latitude*RAD);
  const enu=[[-s,c,0],[-sp*c,-sp*s,cp],[cp*c,cp*s,sp]],out=new Float32Array(9);
  enu.forEach((axis,i)=>{
    const eqj=bases.map(b=>b[0]*axis[0]+b[1]*axis[1]+b[2]*axis[2]);
    GAL.forEach((row,j)=>{out[i*3+j]=row[0]*eqj[0]+row[1]*eqj[1]+row[2]*eqj[2];});
  });
  return out;
}

const VERTEX=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const FRAGMENT=`precision mediump float;
varying vec2 uv;uniform sampler2D sky;uniform vec3 rightAxis;uniform vec3 upAxis;uniform vec3 forwardAxis;
uniform vec2 viewScale;uniform mat3 galactic;uniform vec2 mapScale;
void main(){
 vec2 p=(uv-.5)*viewScale;
 vec3 ray=normalize(rightAxis*p.x+upAxis*p.y+forwardAxis);
 vec3 g=normalize(galactic*ray);
 float lon=atan(g.y,g.x),lat=asin(clamp(g.z,-1.,1.));
 float cb=cos(lat),den=sqrt(max(.0001,1.+cb*cos(lon*.5)));
 vec2 tex=vec2(.5-cb*sin(lon*.5)/den*mapScale.x,.5-sin(lat)/den*mapScale.y);
 vec3 color=texture2D(sky,tex).rgb;
 float band=1.-smoothstep(.20,.48,abs(g.z));
 float light=max(0.,dot(color,vec3(.2126,.7152,.0722))-.085);
 float alpha=light*.43*band;
 vec3 tint=mix(vec3(.69,.77,.91),color/max(.15,max(color.r,max(color.g,color.b))),.22);
 gl_FragColor=vec4(tint*alpha,alpha);
}`;

export class GalaxyRenderer {
  constructor() {
    this.canvas=document.createElement('canvas');this.disposed=false;this.ready=false;
    const gl=this.canvas.getContext('webgl',{alpha:true,depth:false,stencil:false,antialias:false,premultipliedAlpha:true,powerPreference:'low-power'});
    if(!gl)throw new Error('WebGL unavailable');this.gl=gl;
    this.init();
    this.image=new Image();
    this.image.onload=()=>{if(!this.disposed)this.upload();};
    this.image.src=JSON.parse(document.querySelector('#galaxyTexture').textContent);
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;});
    this.canvas.addEventListener('webglcontextrestored',()=>{if(!this.disposed){this.init();if(this.image.complete)this.upload();}});
    this.lastCoordinates=0;
  }
  init() {
    const gl=this.gl;
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    this.program=gl.createProgram();this.vertex=shader(gl.VERTEX_SHADER,VERTEX);this.fragment=shader(gl.FRAGMENT_SHADER,FRAGMENT);
    gl.attachShader(this.program,this.vertex);gl.attachShader(this.program,this.fragment);gl.linkProgram(this.program);
    if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
    gl.useProgram(this.program);
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    this.uniforms={};for(const name of ['sky','rightAxis','upAxis','forwardAxis','viewScale','galactic','mapScale'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
    this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.uniforms.sky,0);
  }
  upload() {
    // Inspect the black margin once: ESA's Hammer map sits inside a 1920x1200 image.
    const strip=document.createElement('canvas');strip.width=this.image.width;strip.height=1;
    const ctx=strip.getContext('2d');ctx.drawImage(this.image,0,Math.floor(this.image.height/2),this.image.width,1,0,0,this.image.width,1);
    const pixels=ctx.getImageData(0,0,strip.width,1).data;
    let left=0,right=strip.width-1;
    while(left<right&&Math.max(pixels[left*4],pixels[left*4+1],pixels[left*4+2])<8)left++;
    while(right>left&&Math.max(pixels[right*4],pixels[right*4+1],pixels[right*4+2])<8)right--;
    const half=(right-left+1)/2;
    this.mapScale=[half/this.image.width,half/(2*this.image.height)];
    // Upload a modest texture once. The light band does not need sharp star pixels.
    const textureCanvas=document.createElement('canvas');textureCanvas.width=1024;textureCanvas.height=Math.round(1024*this.image.height/this.image.width);
    textureCanvas.getContext('2d').drawImage(this.image,0,0,textureCanvas.width,textureCanvas.height);
    const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textureCanvas);
    gl.uniform2fv(this.uniforms.mapScale,this.mapScale);this.ready=true;
  }
  draw(ctx,m,angle,width,height,time,latitude,longitude) {
    if(!this.ready||this.disposed)return;
    // Soft background uses <=512 pixels on its long edge, regardless of phone DPR.
    const scale=Math.min(1,512/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    const gl=this.gl;if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;gl.viewport(0,0,w,h);}
    if(time-this.lastCoordinates>=1000||latitude!==this.latitude||longitude!==this.longitude){
      this.coordinates=horizonToGalactic(time,latitude,longitude);this.lastCoordinates=time;this.latitude=latitude;this.longitude=longitude;
    }
    const c=Math.cos(angle),s=Math.sin(angle),f=Math.min(width,height)/(2*Math.tan(55*RAD/2)),u=this.uniforms;
    gl.uniform3f(u.rightAxis,m[0]*c+m[1]*s,m[3]*c+m[4]*s,m[6]*c+m[7]*s);
    gl.uniform3f(u.upAxis,-m[0]*s+m[1]*c,-m[3]*s+m[4]*c,-m[6]*s+m[7]*c);
    gl.uniform3f(u.forwardAxis,-m[2],-m[5],-m[8]);gl.uniform2f(u.viewScale,width/f,height/f);gl.uniformMatrix3fv(u.galactic,false,this.coordinates);
    gl.drawArrays(gl.TRIANGLES,0,6);
    ctx.drawImage(this.canvas,0,0,width,height);
  }
  dispose() {
    this.disposed=true;this.ready=false;this.image.onload=null;
    const gl=this.gl;gl.deleteTexture(this.texture);gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);gl.deleteShader(this.vertex);gl.deleteShader(this.fragment);
    gl.getExtension('WEBGL_lose_context')?.loseContext();this.canvas.width=this.canvas.height=1;
  }
}
