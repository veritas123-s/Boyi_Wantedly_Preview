import {encodeMuLaw} from './voice-codec.js?v=ca8d86034c2c';
class BoyiVoiceCapture extends AudioWorkletProcessor{
 constructor(){super();this.packet=new Uint8Array(320);this.index=0;this.sum=0;this.count=0;this.energy=0;this.phase=0;this.ratio=sampleRate/16000;}
 process(inputs,outputs){
  for(const channels of outputs)for(const channel of channels)channel.fill(0);
  const input=inputs[0]?.[0];if(!input)return true;
  for(const value of input){this.sum+=value;this.count++;this.phase++;if(this.phase>=this.ratio){this.phase-=this.ratio;const sample=this.sum/this.count;this.packet[this.index++]=encodeMuLaw(sample);this.energy+=sample*sample;this.sum=0;this.count=0;if(this.index===320){this.port.postMessage({buffer:this.packet.buffer,level:Math.sqrt(this.energy/320)},[this.packet.buffer]);this.packet=new Uint8Array(320);this.index=0;this.energy=0;}}}
  return true;
 }
}
registerProcessor('boyi-voice-capture',BoyiVoiceCapture);
