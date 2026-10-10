const VERTEX='attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
const FRAGMENT='precision mediump float;varying vec2 uv;uniform sampler2D image;uniform bool outside;uniform vec3 outsideColor;void main(){vec4 c=texture2D(image,uv);gl_FragColor=outside?vec4(outsideColor*c.a,c.a):c;}';

// The sky is rendered once into a GPU texture. A stencil matching the actual
// wave surface selects original/theme color without reading pixels back.
export class SkyWaterComposite{
 constructor(gl){
  this.gl=gl;
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
  this.vertex=compile(gl.VERTEX_SHADER,VERTEX);this.fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT);this.program=gl.createProgram();
  gl.attachShader(this.program,this.vertex);gl.attachShader(this.program,this.fragment);gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  this.position=gl.getAttribLocation(this.program,'position');this.outside=gl.getUniformLocation(this.program,'outside');this.color=gl.getUniformLocation(this.program,'outsideColor');
  gl.useProgram(this.program);gl.uniform1i(gl.getUniformLocation(this.program,'image'),0);
  this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  this.mask=gl.createBuffer();this.texture=gl.createTexture();this.framebuffer=gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D,this.texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 }
 begin(width,height){
  const gl=this.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);
  if(this.width!==width||this.height!==height){
   gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Sky framebuffer unavailable');
   this.width=width;this.height=height;
  }
  gl.disable(gl.STENCIL_TEST);gl.colorMask(true,true,true,true);gl.viewport(0,0,width,height);
 }
 finish(points,width,height,outsideColor='#00105c'){
  const gl=this.gl,count=points.length-2,farLeft=points[0],farRight=points[points.length-1];
  if(!this.maskData||this.maskData.length!==count*4){this.maskData=new Float32Array(count*4);gl.bindBuffer(gl.ARRAY_BUFFER,this.mask);gl.bufferData(gl.ARRAY_BUFFER,this.maskData.byteLength,gl.DYNAMIC_DRAW);}
  for(let i=0;i<count;i++){
   const p=points[i+1],t=count>1?i/(count-1):0,farX=farLeft.x+(farRight.x-farLeft.x)*t,farY=farLeft.y+(farRight.y-farLeft.y)*t;
   const offset=i*4;this.maskData[offset]=p.x*2/width-1;this.maskData[offset+1]=1-p.y*2/height;
   this.maskData[offset+2]=farX*2/width-1;this.maskData[offset+3]=1-farY*2/height;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height);
  gl.clearColor(0,0,0,0);gl.clearStencil(0);gl.stencilMask(255);gl.clear(gl.COLOR_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
  gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
  const rgb=parseInt(outsideColor.slice(1),16);gl.uniform3f(this.color,((rgb>>16)&255)/255,((rgb>>8)&255)/255,(rgb&255)/255);
  for(let i=0;i<8;i++)gl.disableVertexAttribArray(i);
  gl.enableVertexAttribArray(this.position);gl.disable(gl.BLEND);
  gl.enable(gl.STENCIL_TEST);gl.stencilFunc(gl.ALWAYS,1,255);gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);gl.colorMask(false,false,false,false);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.mask);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.maskData);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);
  gl.uniform1i(this.outside,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,count*2);
  gl.colorMask(true,true,true,true);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);
  gl.stencilFunc(gl.EQUAL,1,255);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.stencilFunc(gl.NOTEQUAL,1,255);gl.uniform1i(this.outside,1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.disable(gl.STENCIL_TEST);
 }
 dispose(){const gl=this.gl;gl.deleteBuffer(this.quad);gl.deleteBuffer(this.mask);gl.deleteTexture(this.texture);gl.deleteFramebuffer(this.framebuffer);gl.deleteProgram(this.program);gl.deleteShader(this.vertex);gl.deleteShader(this.fragment);}
}
