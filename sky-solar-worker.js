import {calculateSolar} from './sky-solar-data.js';
self.onmessage=event=>{
  const {id,time,latitude,longitude}=event.data;
  try{self.postMessage({id,time,latitude,longitude,bodies:calculateSolar(time,latitude,longitude)});}
  catch{self.postMessage({id,error:true});}
};
