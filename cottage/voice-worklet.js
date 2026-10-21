import {encodeMuLaw,decodeMuLaw} from './voice-codec.js?v=ca8d86034c2c';

// The audio thread owns the playback clock. Importable without browser globals
// so the same queue is exercised by the network/jitter fixtures.
export class VoicePlaybackBuffer{
 constructor({outputRate=48000}={}){this.outputRate=outputRate;this.frames=[];this.position=0;this.started=false;this.lastSequence=-1;this.lastArrival=null;this.jitter=0;this.targetFrames=3;this.lastValue=0;this.ramp=0;this.metrics={received:0,lateDropped:0,overflowDropped:0,underruns:0,concealed:0,maxBufferedMs:0,renderedSamples:0};}
 reset(){this.frames.length=0;this.position=0;this.started=false;this.lastSequence=-1;this.lastArrival=null;this.lastValue=0;this.ramp=0;}
 push(bytes,sequence,time){
  if(!Number.isInteger(sequence)||sequence<=this.lastSequence||bytes.length!==320){this.metrics.lateDropped++;return false;}
  const step=sequence-this.lastSequence,gap=this.lastArrival===null?0:time-this.lastArrival;
  if(this.lastArrival!==null){
   if(gap>.4||step>15){this.frames.length=0;this.position=0;this.started=false;this.ramp=0;}
   else{const variation=Math.abs(gap-.02*Math.max(1,step)),weight=variation>this.jitter?.25:.005;this.jitter=(1-weight)*this.jitter+weight*variation;this.targetFrames=Math.max(2,Math.min(8,Math.ceil((.04+4*this.jitter)/.02)));}
  }
  // Quiet continuation for short losses; a bounded queue favours current speech.
  if(this.started&&step>1&&step<=3&&this.frames.length){const previous=this.frames.at(-1).samples;for(let n=1;n<step;n++){const samples=new Float32Array(320);for(let i=0;i<320;i++)samples[i]=previous[i]*.45**n;this.frames.push({samples,sequence:sequence-step+n});this.metrics.concealed++;}}
  const samples=new Float32Array(320);for(let i=0;i<320;i++)samples[i]=decodeMuLaw(bytes[i]);this.frames.push({samples,sequence});this.lastSequence=sequence;this.lastArrival=time;this.metrics.received++;
  const maximum=Math.min(10,this.targetFrames+2);if(this.frames.length>maximum){const discarded=this.frames.length-maximum;this.frames.splice(0,discarded);this.position=0;this.ramp=0;this.metrics.overflowDropped+=discarded;}
  this.metrics.maxBufferedMs=Math.max(this.metrics.maxBufferedMs,this.bufferedMs);return true;
 }
 get bufferedMs(){return Math.max(0,(this.frames.length*320-this.position)/16);}
 stats(){return{...this.metrics,bufferedMs:this.bufferedMs,targetMs:this.targetFrames*20,queuedFrames:this.frames.length};}
 render(output,time){
  const ratio=16000/this.outputRate,fade=1/(this.outputRate*.005);
  for(let i=0;i<output.length;i++){
   if(!this.started&&this.frames.length&&(this.frames.length>=this.targetFrames||Number.isFinite(time)&&time-this.lastArrival>.12)){this.started=true;this.ramp=0;}
   if(this.started&&!this.frames.length){this.started=false;this.metrics.underruns++;this.targetFrames=Math.min(8,this.targetFrames+1);}
   if(!this.started){this.lastValue*=.985;output[i]=this.lastValue;continue;}
   const samples=this.frames[0].samples,index=Math.floor(this.position),fraction=this.position-index;this.ramp=Math.min(1,this.ramp+fade);this.lastValue=(samples[index]+(samples[Math.min(319,index+1)]-samples[index])*fraction)*this.ramp;output[i]=this.lastValue;this.metrics.renderedSamples++;this.position+=ratio;
   if(this.position>=320){this.position-=320;this.frames.shift();}
  }
 }
}

const Processor=globalThis.AudioWorkletProcessor||class{};
export class BoyiVoiceCapture extends Processor{
 constructor(){super();this.packet=new Uint8Array(320);this.index=0;this.sum=0;this.count=0;this.energy=0;this.phase=0;this.ratio=sampleRate/16000;this.sequence=0;this.pending=0;this.dropped=0;this.active=true;this.port.onmessage=e=>{if(e.data?.type==='ack')this.pending=Math.max(0,this.pending-1);if(e.data?.type==='active'){this.active=!!e.data.active;this.index=0;this.energy=0;}};}
 process(inputs,outputs){
  for(const channels of outputs)for(const channel of channels)channel.fill(0);
  const input=inputs[0]?.[0];if(!input)return true;
  for(const value of input){this.sum+=value;this.count++;this.phase++;if(this.phase>=this.ratio){this.phase-=this.ratio;const sample=this.sum/this.count;this.packet[this.index++]=encodeMuLaw(sample);this.energy+=sample*sample;this.sum=0;this.count=0;if(this.index===320){const sequence=this.sequence++;if(this.active&&this.pending<3){this.pending++;this.port.postMessage({buffer:this.packet.buffer,level:Math.sqrt(this.energy/320),sequence,capturedAt:currentTime,captureDropped:this.dropped},[this.packet.buffer]);this.packet=new Uint8Array(320);}else if(this.active)this.dropped++;this.index=0;this.energy=0;}}}
  return true;
 }
}
export class BoyiVoicePlayback extends Processor{
 constructor(){super();this.queue=new VoicePlaybackBuffer({outputRate:sampleRate});this.lastStats=0;this.port.onmessage=e=>{if(e.data?.type==='frame')this.queue.push(new Uint8Array(e.data.buffer,e.data.offset||0,320),e.data.sequence,currentTime);else if(e.data?.type==='reset')this.queue.reset();};}
 process(inputs,outputs){const output=outputs[0]?.[0];if(output)this.queue.render(output,currentTime);if(currentTime-this.lastStats>=.5){this.lastStats=currentTime;this.port.postMessage({type:'stats',...this.queue.stats()});}return true;}
}
if(typeof registerProcessor==='function'){registerProcessor('boyi-voice-capture',BoyiVoiceCapture);registerProcessor('boyi-voice-playback',BoyiVoicePlayback);}
