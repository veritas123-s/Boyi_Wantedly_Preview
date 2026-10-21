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
 },
 classroom:{seats:Array.from({length:20},(_,i)=>{const r=Math.floor(i/4),c=i%4,x=[-3,-1,1,3][c],z=[-2,-.1,1.8,3.7,5.6][r];return{id:`classroom-r${r}-c${c}`,label:`第${r+1}排${c+1}号座位`,x,z,yaw:0,height:.52,exit:{x:x+.82,z}};}),items:[]}
});
export const findSeat = (room,id) => ROOM_LAYOUT[room]?.seats.find(s=>s.id===id);
export const findItem = (room,id) => ROOM_LAYOUT[room]?.items.find(s=>s.id===id);

// One local-space contract for browser physics and service validation.
export const ROOM_ORIGINS = Object.freeze({
 lobby:Object.freeze({x:0,y:0,z:0}),
 cottage:Object.freeze({x:0,y:0,z:0}),
 cinema:Object.freeze({x:12,y:0,z:2.6}),
 classroom:Object.freeze({x:-31.8,y:0,z:4.8})
});
export const ROOM_BOUNDS = Object.freeze({
 lobby:Object.freeze({minX:-5.58,maxX:5.58,minZ:-6.55,maxZ:6.55,maxY:4.3,spawnX:0,spawnZ:4.5}),
 cottage:Object.freeze({minX:-24.3,maxX:6.3,minZ:-6.6,maxZ:6.6,maxY:4.3,spawnX:0,spawnZ:4.5}),
 cinema:Object.freeze({minX:-6.3,maxX:5.58,minZ:-6.55,maxZ:6.55,maxY:4.3,spawnX:0,spawnZ:5.1}),
 classroom:Object.freeze({minX:-7.4,maxX:8.1,minZ:-7.1,maxZ:7.1,maxY:4.3,spawnX:6.6,spawnZ:0})
});
export const ROOM_CONNECTIONS = Object.freeze({
 cottage:Object.freeze({target:'cinema',axis:'x',direction:1,threshold:6,span:Object.freeze([1.8,3.4])}),
 cinema:Object.freeze({target:'cottage',axis:'x',direction:-1,threshold:-6,span:Object.freeze([-.8,.8])})
});

// Multiple neighbouring rooms share one continuous geometry, with separate access checks.
export const ROOM_PORTALS=Object.freeze({
 lobby:Object.freeze([]),
 cottage:Object.freeze([ROOM_CONNECTIONS.cottage,Object.freeze({target:'classroom',axis:'x',direction:-1,threshold:-24,span:Object.freeze([4,5.6])})]),
 cinema:Object.freeze([ROOM_CONNECTIONS.cinema]),
 classroom:Object.freeze([Object.freeze({target:'cottage',axis:'x',direction:1,threshold:7.8,span:Object.freeze([-.8,.8])})])
});
