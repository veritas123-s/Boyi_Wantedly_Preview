// ITU G.711 μ-law, 16 kHz mono, one 320-sample packet per 20 ms.
export function encodeMuLaw(sample){
 let value=Math.max(-32768,Math.min(32767,Math.round(sample*32767))),sign=value<0?0x80:0;
 if(value<0)value=-value;value=Math.min(32635,value)+132;
 let exponent=7;for(let mask=0x4000;exponent>0&&(value&mask)===0;mask>>=1)exponent--;
 return ~(sign|(exponent<<4)|((value>>(exponent+3))&15))&255;
}
export function decodeMuLaw(byte){const v=(~byte)&255,sign=v&128,exponent=(v>>4)&7;const sample=(((v&15)<<3)+132)*(1<<exponent)-132;return(sign?-sample:sample)/32768;}
