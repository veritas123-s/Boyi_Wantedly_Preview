// Shared with the service byte-for-byte. Coordinates are metres; yaw faces -Z.
export const ROOM_LAYOUT = Object.freeze({
 lobby: {
  seats: [
   {id:'hall-table-left-1',label:'阅览椅',x:-3.9,z:-1.24,yaw:-Math.PI/2,height:.55,exit:{x:-3.9,z:-.24}},
   {id:'hall-table-left-2',label:'阅览椅',x:-3.9,z:1.46,yaw:-Math.PI/2,height:.55,exit:{x:-3.9,z:2.46}},
   {id:'hall-table-right-1',label:'阅览椅',x:-.9,z:-1.24,yaw:Math.PI/2,height:.55,exit:{x:0,z:-1.24}},
   {id:'hall-table-right-2',label:'阅览椅',x:-.9,z:1.46,yaw:Math.PI/2,height:.55,exit:{x:0,z:1.46}},
   {id:'hall-lounge-1',label:'休闲椅',x:3.87,z:-1.68,yaw:Math.PI/2,height:.56,exit:{x:2.65,z:-1.68}},
   {id:'hall-lounge-2',label:'休闲椅',x:3.87,z:2.04,yaw:Math.PI/2,height:.56,exit:{x:2.65,z:2.04}}
  ],
  items:[{id:'hall-book',kind:'book',label:'拿起书本',x:-1.7,y:1.08,z:1.05},{id:'hall-cup',kind:'cup',label:'拿起茶杯',x:3.1,y:.8,z:.18}]
 },
 cottage: {
  seats:[
   {id:'study-desk',label:'书桌椅',x:2.78,z:1.14,yaw:-.1,height:.568,exit:{x:1.55,z:1.7}},
   {id:'study-lounge',label:'阅读扶手椅',x:3.9,z:4.95,yaw:Math.PI-.42,height:.57,exit:{x:2.7,z:4.85}}
  ],
  items:[{id:'study-book',kind:'book',label:'拿起书本',x:1.65,y:1.13,z:.34},{id:'study-cup',kind:'cup',label:'拿起茶杯',x:3.55,y:1.13,z:.28}]
 },
 cinema: {
  seats:[
   ...[-1.95,-.65,.65,1.95].map((x,i)=>({id:'cinema-front-'+i,label:'前排沙发',x,z:.35,yaw:0,height:.52,exit:{x,z:-.85}})),
   ...[-1.95,-.65,.65,1.95].map((x,i)=>({id:'cinema-back-'+i,label:'后排沙发',x,z:3.15,yaw:0,height:.52,exit:{x,z:4.35}}))
  ],
  items:[{id:'cinema-book',kind:'book',label:'拿起影集',x:-4.15,y:.92,z:2.0},{id:'cinema-cup',kind:'cup',label:'拿起茶杯',x:4.1,y:.92,z:1.8}]
 }
});
export const findSeat = (room,id) => ROOM_LAYOUT[room]?.seats.find(s=>s.id===id);
export const findItem = (room,id) => ROOM_LAYOUT[room]?.items.find(s=>s.id===id);
