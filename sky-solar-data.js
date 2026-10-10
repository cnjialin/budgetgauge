import {Body,Observer,Equator,Illumination,MakeTime} from './vendor/astronomy.cjs';

export function calculateSolar(time,latitude,longitude) {
  const date=MakeTime(new Date(time)),observer=new Observer(latitude,longitude,0);
  return [Body.Sun,Body.Moon,Body.Mercury,Body.Venus,Body.Mars,Body.Jupiter,Body.Saturn,Body.Uranus,Body.Neptune].map(body=>{
    const equator=Equator(body,date,observer,true,true),light=Illumination(body,date);
    return {body,ra:equator.ra*15*Math.PI/180,dec:equator.dec*Math.PI/180,magnitude:light.mag,
      phase:light.phase_fraction,distance:equator.dist};
  });
}
