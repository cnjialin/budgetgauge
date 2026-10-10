// Compatibility path for devices without WebGL. Each sky object is still
// rendered once; source-in applies the theme tint to that cached image.
export class SkyCanvasComposite{
 constructor(){this.canvas=document.createElement('canvas');this.tint=document.createElement('canvas');this.ctx=this.canvas.getContext('2d');this.tintCtx=this.tint.getContext('2d');}
 begin(width,height){
  const ratio=Math.min(2,globalThis.devicePixelRatio||1),w=Math.round(width*ratio),h=Math.round(height*ratio);
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=this.tint.width=w;this.canvas.height=this.tint.height=h;this.ctx.setTransform(ratio,0,0,ratio,0,0);this.tintCtx.setTransform(ratio,0,0,ratio,0,0);}
  this.ctx.clearRect(0,0,width,height);return this.ctx;
 }
 finish(ctx,points,width,height,color){
  const water=new Path2D();points.forEach((p,i)=>i?water.lineTo(p.x,p.y):water.moveTo(p.x,p.y));water.closePath();
  const outside=new Path2D();outside.rect(0,0,width,height);outside.addPath(water);
  const tint=this.tintCtx;tint.clearRect(0,0,width,height);tint.drawImage(this.canvas,0,0,width,height);
  tint.globalCompositeOperation='source-in';tint.fillStyle=color;tint.fillRect(0,0,width,height);tint.globalCompositeOperation='source-over';
  ctx.save();ctx.clip(water);ctx.drawImage(this.canvas,0,0,width,height);ctx.restore();
  ctx.save();ctx.clip(outside,'evenodd');ctx.drawImage(this.tint,0,0,width,height);ctx.restore();
 }
 dispose(){this.canvas.width=this.canvas.height=this.tint.width=this.tint.height=1;}
}
