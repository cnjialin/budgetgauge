// ENU coordinates: east, north, up. Device looks through its back (-Z).
const RAD = Math.PI / 180;
export function sidereal(time, longitude) {
  const d = time / 86400000 + 2440587.5 - 2451545;
  return ((280.46061837 + 360.98564736629 * d + longitude) % 360) * RAD;
}
export function horizontal(ra, dec, latitude, lst) {
  const h = lst - ra, c = Math.cos(dec), s = Math.sin(dec);
  return [-c * Math.sin(h), s * Math.cos(latitude) - c * Math.cos(h) * Math.sin(latitude),
    s * Math.sin(latitude) + c * Math.cos(h) * Math.cos(latitude)];
}
export function orientationMatrix(alpha, beta, gamma) {
  const a=alpha*RAD,b=beta*RAD,g=gamma*RAD;
  const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cg=Math.cos(g),sg=Math.sin(g);
  return [ca*cg-sa*sb*sg,-sa*cb,ca*sg+sa*sb*cg,
    sa*cg+ca*sb*sg,ca*cb,sa*sg-ca*sb*cg,-cb*sg,sb,cb*cg];
}
export function project(v, matrix, angle, width, height) {
  const x=v[0]*matrix[0]+v[1]*matrix[3]+v[2]*matrix[6];
  const y=v[0]*matrix[1]+v[1]*matrix[4]+v[2]*matrix[7];
  const z=-(v[0]*matrix[2]+v[1]*matrix[5]+v[2]*matrix[8]);
  if(z<=.02)return null;
  const c=Math.cos(angle),s=Math.sin(angle),f=Math.min(width,height)/(2*Math.tan(55*RAD/2));
  const px=width/2+f*(x*c+y*s)/z,py=height/2-f*(-x*s+y*c)/z;
  return px < -10 || px > width+10 || py < -10 || py > height+10 ? null : [px,py];
}
export function epochPosition(row, time) {
  const years=(time/86400000+2440587.5-2451545)/365.25,t=years/100;
  let ra=row[0]*15*RAD,dec=row[1]*RAD;
  ra+=(row[4]||0)*years/3600000*RAD/Math.max(.00001,Math.cos(dec));
  dec+=(row[5]||0)*years/3600000*RAD;
  const zeta=(2306.2181*t+.30188*t*t+.017998*t*t*t)/3600*RAD;
  const z=(2306.2181*t+1.09468*t*t+.018203*t*t*t)/3600*RAD;
  const theta=(2004.3109*t-.42665*t*t-.041833*t*t*t)/3600*RAD;
  const a=Math.cos(dec)*Math.sin(ra+zeta);
  const b=Math.cos(theta)*Math.cos(dec)*Math.cos(ra+zeta)-Math.sin(theta)*Math.sin(dec);
  const c=Math.sin(theta)*Math.cos(dec)*Math.cos(ra+zeta)+Math.cos(theta)*Math.sin(dec);
  return [Math.atan2(a,b)+z,Math.asin(Math.max(-1,Math.min(1,c)))];
}

// Interpolate rotations, never matrix entries: this preserves angles and lengths.
export function rotationQuaternion(m) {
  const q=new Float64Array(4),trace=m[0]+m[4]+m[8];
  if(trace>0){const s=Math.sqrt(trace+1)*2;q[3]=s/4;q[0]=(m[7]-m[5])/s;q[1]=(m[2]-m[6])/s;q[2]=(m[3]-m[1])/s;}
  else if(m[0]>m[4]&&m[0]>m[8]){const s=Math.sqrt(1+m[0]-m[4]-m[8])*2;q[3]=(m[7]-m[5])/s;q[0]=s/4;q[1]=(m[1]+m[3])/s;q[2]=(m[2]+m[6])/s;}
  else if(m[4]>m[8]){const s=Math.sqrt(1+m[4]-m[0]-m[8])*2;q[3]=(m[2]-m[6])/s;q[0]=(m[1]+m[3])/s;q[1]=s/4;q[2]=(m[5]+m[7])/s;}
  else{const s=Math.sqrt(1+m[8]-m[0]-m[4])*2;q[3]=(m[3]-m[1])/s;q[0]=(m[2]+m[6])/s;q[1]=(m[5]+m[7])/s;q[2]=s/4;}
  return q;
}
export function interpolateRotation(current,target,amount,out=new Float64Array(9)) {
  let dot=0;for(let i=0;i<4;i++)dot+=current[i]*target[i];
  const sign=dot<0?-1:1;dot=Math.min(1,Math.abs(dot));
  let a=1-amount,b=amount;
  if(dot<.9995){const theta=Math.acos(dot),s=Math.sin(theta);a=Math.sin((1-amount)*theta)/s;b=Math.sin(amount*theta)/s;}
  let length=0;for(let i=0;i<4;i++){current[i]=a*current[i]+b*sign*target[i];length+=current[i]*current[i];}
  length=Math.sqrt(length);for(let i=0;i<4;i++)current[i]/=length;
  const [x,y,z,w]=current;
  out[0]=1-2*(y*y+z*z);out[1]=2*(x*y-z*w);out[2]=2*(x*z+y*w);
  out[3]=2*(x*y+z*w);out[4]=1-2*(x*x+z*z);out[5]=2*(y*z-x*w);
  out[6]=2*(x*z-y*w);out[7]=2*(y*z+x*w);out[8]=1-2*(x*x+y*y);
  return out;
}
