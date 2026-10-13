
const $=s=>document.querySelector(s);
const NOTE=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SCALES={minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],major:[0,2,4,5,7,9,11]};
const R=Math.random, ri=(a,b)=>a+Math.floor(R()*(b-a+1)), pick=a=>a[Math.floor(R()*a.length)], chance=p=>R()<p;
const D16=()=>Array(16).fill(0), M16=()=>Array(16).fill(null);
const at=(a,idx,v=1)=>{idx.forEach(i=>a[i]=v);return a};
const euclid=(k,n=16,rot=0)=>{const r=[];for(let i=0;i<n;i++)if((i*k)%n<k)r.push((i+rot)%n);return r};
const note=(d,len=1,v=1,w)=>({d,len,v,w});
const CT=[0,2,4,7];

const TRACKS=[
  {id:'kick',name:'Kick',type:'drum'},{id:'clap',name:'Snare',type:'drum'},
  {id:'hat',name:'Hat',type:'drum'},{id:'ohat',name:'Open',type:'drum'},
  {id:'bass',name:'Bass',type:'mel'},{id:'lead',name:'Lead',type:'mel'},
  {id:'pad',name:'Chords',type:'drum'}];

function melody(count,maxLen=3,lo=-2,hi=9){
  const pos=new Set([0]);while(pos.size<count)pos.add(ri(1,15));
  const ps=[...pos].sort((a,b)=>a-b),out=M16();let d=pick(CT);
  ps.forEach((s,i)=>{const nx=ps[i+1]??16;if(i)d=Math.max(lo,Math.min(hi,d+pick([-2,-1,-1,1,1,2,0])));out[s]=note(d,Math.min(maxLen,nx-s),i?.85:1)});
  return out;
}
function arp(){
  const tones=pick([[0,2,4,7],[0,4,7,9],[0,2,4,2],[7,4,2,0]]),mode=pick(['up','ping','skip']),out=M16();
  for(let i=0;i<16;i++){const ix=mode==='up'?i%4:mode==='ping'?[0,1,2,3,2,1][i%6]:[0,2,1,3][i%4];out[i]=note(tones[ix],1,i%4?.7:1)}
  return out;
}
const base=()=>({kick:D16(),clap:D16(),hat:D16(),ohat:D16(),bass:M16(),lead:M16(),pad:D16()});

const STYLES={
  house:{lead:'pluck',label:'House',bpm:124,scales:['minor','dorian'],progs:[[0,5,2,6],[0,3,0,4],[0,6,5,6],[3,4,0,0]],swing:.3,wobble:0,space:.3,echo:.2,
    sound:{kickDecay:.45,kickEnd:50,bassWave:'sawtooth',bassDetune:6,bassCut:220,bassEnv:1400,bassDecay:.08,bassQ:6,padCut:1600},
    gen(){const p=base();at(p.kick,[0,4,8,12]);at(p.clap,[4,12]);at(p.ohat,[2,6,10,14],.8);
      for(let i=0;i<16;i++)if(chance(.55))p.hat[i]=i%2?.5:.3; if(chance(.4))p.clap[15]=.5;
      pick([[2,6,10,14],[2,3,6,10,11,14],[0,3,6,9,12,14],[2,5,8,10,13]]).forEach(i=>p.bass[i]=note(pick([0,0,0,7,4]),1,i%4===2?1:.8));
      euclid(ri(3,5),16,ri(0,2)).forEach(i=>p.lead[i]=note(pick(CT),1,chance(.5)?1:.7));
      if(chance(.5))p.pad[0]=1;else at(p.pad,pick([[3,10],[2,6,10,14],[0,6,12]]));return p}},
  techno:{lead:'acid',label:'Techno',bpm:130,scales:['phrygian','minor'],progs:[[0,0,0,0],[0,0,5,0],[0,1,0,1]],swing:.08,wobble:0,space:.25,echo:.35,
    sound:{kickDecay:.55,kickEnd:42,bassWave:'sawtooth',bassDetune:4,bassCut:160,bassEnv:900,bassDecay:.05,bassQ:10,padCut:900},
    gen(){const p=base();at(p.kick,[0,4,8,12]);if(chance(.6))at(p.clap,[4,12]);at(p.ohat,[2,6,10,14],.6);
      for(let i=0;i<16;i++)p.hat[i]=i%4===2?.8:i%2?.5:.3;
      for(let i=0;i<16;i++)if(i%4&&chance(.85))p.bass[i]=note(0,1,i%4===2?1:.7);
      euclid(ri(3,5),16,ri(0,3)).forEach(i=>p.lead[i]=note(pick([0,0,2,7]),1,.9));
      if(chance(.5))at(p.pad,euclid(3,16,ri(0,2)));return p}},
  trance:{lead:'supersaw',label:'Trance',bpm:138,scales:['minor'],progs:[[0,5,2,6],[5,6,0,0],[0,5,3,4]],swing:0,wobble:0,space:.45,echo:.35,
    sound:{kickDecay:.4,kickEnd:50,bassWave:'sawtooth',bassDetune:8,bassCut:260,bassEnv:1200,bassDecay:.07,bassQ:4,padCut:2200},
    gen(){const p=base();at(p.kick,[0,4,8,12]);at(p.clap,[4,12]);at(p.ohat,[2,6,10,14],.8);
      for(let i=0;i<16;i++)if(i%2&&chance(.5))p.hat[i]=.3;
      for(let i=0;i<16;i++)if(i%4)p.bass[i]=note(0,1,i%4===2?1:.75);
      p.lead=arp();p.pad[0]=1;return p}},
  synthwave:{lead:'brass',label:'Synthwave',bpm:100,scales:['minor'],progs:[[0,5,2,6],[0,6,5,6],[5,6,0,0]],swing:0,wobble:0,space:.45,echo:.4,
    sound:{kickDecay:.5,kickEnd:48,bassWave:'sawtooth',bassDetune:10,bassCut:300,bassEnv:1000,bassDecay:.15,bassQ:3,padCut:1800},
    gen(){const p=base();at(p.kick,chance(.5)?[0,8,10]:[0,8]);at(p.clap,[4,12]);for(let i=0;i<16;i+=2)p.hat[i]=i%4?.6:.4;if(chance(.5))p.ohat[14]=.7;
      for(let i=0;i<16;i+=2)p.bass[i]=note(i%4?7:0,1,.9);p.lead=melody(ri(5,7));p.pad[0]=1;return p}},
  dubstep:{lead:'squarelead',label:'Dubstep',bpm:140,scales:['phrygian','minor'],progs:[[0,0,5,6],[0,0,0,0],[0,5,0,6]],swing:0,wobble:.65,space:.3,echo:.25,
    sound:{kickDecay:.5,kickEnd:45,bassWave:'sawtooth',bassDetune:14,bassCut:200,bassEnv:400,bassDecay:.2,bassQ:12,padCut:1500},
    gen(){const p=base();at(p.kick,[0]);if(chance(.6))p.kick[pick([10,11,3])]=.9;p.clap[8]=1;for(let i=0;i<16;i+=2)if(chance(.7))p.hat[i]=.4;if(chance(.4))p.ohat[6]=.6;
      pick([[[0,6],[6,2],[8,6],[14,2]],[[0,8],[8,4],[12,4]],[[0,3],[3,3],[6,2],[8,8]],[[0,4],[4,4],[8,4],[12,4]]])
        .forEach(([s,l])=>p.bass[s]=note(pick([0,0,1,-2,4]),l,1,pick([1,2,3,4,6])));
      p.lead=melody(ri(2,4),4,0,7);p.pad[0]=1;return p}},
  dnb:{lead:'flute',label:'Drum & Bass',bpm:172,scales:['minor','dorian'],progs:[[0,0,5,6],[0,5,3,4],[0,0,6,6]],swing:0,wobble:0,space:.35,echo:.3,
    sound:{kickDecay:.35,kickEnd:55,bassWave:'sawtooth',bassDetune:22,bassCut:380,bassEnv:300,bassDecay:.3,bassQ:5,padCut:2000},
    gen(){const p=base();at(p.kick,chance(.5)?[0,10]:[0,7,10]);at(p.clap,[4,12]);if(chance(.5))p.clap[pick([7,9,15])]=.4;
      for(let i=0;i<16;i++)p.hat[i]=i%2?(chance(.4)?.3:0):.6;if(chance(.5))p.ohat[14]=.7;
      pick([[[0,6],[6,4],[10,6]],[[0,10],[10,6]],[[0,4],[6,4],[10,4],[14,2]]]).forEach(([s,l])=>p.bass[s]=note(pick([0,0,5,-2]),l,1));
      p.lead=melody(ri(3,5),4,0,9);p.pad[0]=1;return p}},
  futurebass:{lead:'chime',label:'Future Bass',bpm:128,scales:['major'],progs:[[3,4,5,0],[0,4,5,3],[5,3,0,4],[3,4,2,5]],swing:.12,wobble:0,space:.5,echo:.35,
    // Mello x TFR: half-time drums, pumping supersaw chord stabs, FM "chime" lead with a pitch blip
    sound:{kickDecay:.45,kickEnd:50,bassWave:'sawtooth',bassDetune:10,bassCut:320,bassEnv:700,bassDecay:.2,bassQ:3,padCut:3200},
    gen(){const p=base();at(p.kick,pick([[0,10],[0,3,10],[0,7,10]]));p.clap[8]=1;if(chance(.4))p.clap[15]=.4;
      for(let i=0;i<16;i+=2)p.hat[i]=i%4?.5:.3;if(chance(.5))at(p.hat,[13,14,15],.35);
      pick([[[0,8],[8,8]],[[0,6],[6,2],[8,8]],[[0,3],[3,5],[8,8]]]).forEach(([s,l])=>p.bass[s]=note(0,l,1));
      p.lead=melody(ri(5,7),2,0,9);at(p.pad,pick([[0,3,6,8,11,14],[0,2,4,6,8,10,12,14],[0,6,8,14],[0,3,6,10,12]]));return p}},
};

let S;
const defaultSections=()=>Theory.ARRANGEMENT.map(s=>({...s,tracks:[...s.tracks]}));
const presetSynth=id=>Synth.normalize((Synth.byId(id)||Synth.PRESETS[0]).p);
// keepSynth: New track keeps the lead sound you dialled in; picking a style loads that style's lead preset.
function fresh(style,key,keepSynth){
  const st=STYLES[style],synth=keepSynth&&S?.synth?{synth:S.synth,synthId:S.synthId}:{synth:presetSynth(st.lead),synthId:st.lead};
  return {style,key:key??pick([0,2,5,7,9,4]),scale:pick(st.scales),prog:pick(st.progs).slice(),bpm:st.bpm,swing:st.swing,cutoff:1,wobble:st.wobble,
    space:st.space,echo:st.echo,vol:.8,arrange:S?.arrange||false,sections:S?.sections||defaultSections(),sound:{...st.sound},...synth,pat:st.gen(),mute:S?.mute||{}};
}
try{const s=JSON.parse(localStorage.getItem('sidechain-v1'));if(s&&s.pat&&STYLES[s.style])S=s}catch(e){}
if(!S)S=fresh('futurebass',0);
if(!S.sections)S.sections=defaultSections();
if(!S.synth){S.synthId=STYLES[S.style].lead;S.synth=presetSynth(S.synthId)}else S.synth=Synth.normalize(S.synth);
try{const h=JSON.parse(localStorage.getItem('sidechain-handoff'));if(h){Object.assign(S,h);localStorage.removeItem('sidechain-handoff')}}catch(e){}
function save(){try{localStorage.setItem('sidechain-v1',JSON.stringify(S))}catch(e){}}

/* ---------- music helpers ---------- */
const semis=d=>{const sc=SCALES[S.scale],o=Math.floor(d/7),i=((d%7)+7)%7;return sc[i]+12*o};
const mtof=m=>440*Math.pow(2,(m-69)/12);
const bassBase=()=>36+(S.key>=7?S.key-12:S.key);
const leadNote=d=>bassBase()+36+12*S.synth.oct+semis(d);
function chordName(r){const rs=semis(r),t=semis(r+2)-rs,f=semis(r+4)-rs;return NOTE[((S.key+rs)%12+12)%12]+(t===3?(f===6?'°':'m'):'')}
function roman(r){const rs=semis(r),t=semis(r+2)-rs,f=semis(r+4)-rs,n=['I','II','III','IV','V','VI','VII'][((r%7)+7)%7];return t===3?n.toLowerCase()+(f===6?'°':''):n}

/* ---------- audio engine ---------- */
let leadAn,ctx,masterGain,masterFilter,duck,drumBus,musicBus,leadOut,padOut,revIn,delIn,delay,analyser,noiseBuf,ohatG=null;
function initAudio(){
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  masterGain=ctx.createGain();masterGain.gain.value=S.vol;
  masterFilter=ctx.createBiquadFilter();masterFilter.type='lowpass';masterFilter.Q.value=1.2;masterFilter.frequency.value=cutHz();
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.2;
  analyser=ctx.createAnalyser();analyser.fftSize=1024;
  masterFilter.connect(comp).connect(masterGain).connect(analyser).connect(ctx.destination);
  drumBus=ctx.createGain();drumBus.connect(masterFilter);
  duck=ctx.createGain();duck.connect(masterFilter);
  musicBus=ctx.createGain();musicBus.gain.value=.9;musicBus.connect(duck);
  // reverb
  const len=ctx.sampleRate*2.4,ir=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(R()*2-1)*Math.pow(1-i/len,2.6)}
  const conv=ctx.createConvolver();conv.buffer=ir;revIn=ctx.createGain();revIn.gain.value=S.space;revIn.connect(conv).connect(duck);
  // delay
  delIn=ctx.createGain();delIn.gain.value=S.echo;delay=ctx.createDelay(2);delay.delayTime.value=60/S.bpm*.75;
  const fb=ctx.createGain();fb.gain.value=.38;const dlp=ctx.createBiquadFilter();dlp.frequency.value=2800;
  delIn.connect(delay);delay.connect(dlp);dlp.connect(fb).connect(delay);dlp.connect(duck);
  leadOut=ctx.createGain();leadOut.connect(musicBus);leadOut.connect(delIn);leadOut.connect(revIn);
  leadAn=ctx.createAnalyser();leadAn.fftSize=2048;leadOut.connect(leadAn); // feeds the synth panel's live wave
  padOut=ctx.createGain();padOut.gain.value=.7;padOut.connect(musicBus);padOut.connect(revIn);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=R()*2-1;
}
const cutHz=()=>150*Math.pow(20000/150,S.cutoff);
function noiseSrc(t,dur){const s=ctx.createBufferSource();s.buffer=noiseBuf;s.start(t,R()*.5);s.stop(t+dur);return s}
function duckAt(t){const g=duck.gain;g.cancelScheduledValues(t);g.setTargetAtTime(.22,t,.004);g.setTargetAtTime(1,t+.03,.07)}

function kick(t,v){
  const sd=S.sound,o=ctx.createOscillator(),g=ctx.createGain();
  o.frequency.setValueAtTime(165,t);o.frequency.exponentialRampToValueAtTime(sd.kickEnd,t+.11);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+sd.kickDecay);
  o.connect(g).connect(drumBus);o.start(t);o.stop(t+sd.kickDecay+.05);
  const c=ctx.createOscillator(),cg=ctx.createGain();c.type='square';c.frequency.value=1600;
  cg.gain.setValueAtTime(v*.12,t);cg.gain.exponentialRampToValueAtTime(.001,t+.012);c.connect(cg).connect(drumBus);c.start(t);c.stop(t+.02);
  duckAt(t);
}
function clap(t,v){
  const s=noiseSrc(t,.4),bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1500;bp.Q.value=.8;
  const g=ctx.createGain();g.gain.setValueAtTime(0,t);
  [0,.011,.022].forEach(k=>{g.gain.setValueAtTime(v*.8,t+k);g.gain.linearRampToValueAtTime(v*.15,t+k+.009)});
  g.gain.setValueAtTime(v*.75,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+.26);
  s.connect(bp).connect(g);g.connect(drumBus);const rs=ctx.createGain();rs.gain.value=.5;g.connect(rs).connect(revIn);
  const o=ctx.createOscillator(),og=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(160,t+.06);
  og.gain.setValueAtTime(v*.35,t);og.gain.exponentialRampToValueAtTime(.001,t+.09);o.connect(og).connect(drumBus);o.start(t);o.stop(t+.1);
}
function hat(t,v,open){
  if(ohatG){ohatG.gain.cancelScheduledValues(t);ohatG.gain.setTargetAtTime(0,t,.01);ohatG=null}
  const s=noiseSrc(t,open?.6:.12),hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=open?6500:7500;
  const g=ctx.createGain(),dec=open?.38:.045;g.gain.setValueAtTime(v*.32,t);g.gain.exponentialRampToValueAtTime(.001,t+dec);
  s.connect(hp).connect(g).connect(drumBus);if(open)ohatG=g;
}
function bass(t,f,dur,v,w){
  const sd=S.sound,g=ctx.createGain(),lp=ctx.createBiquadFilter(),end=t+dur+.06;lp.type='lowpass';lp.Q.value=sd.bassQ;
  [-1,1].forEach(s=>{const o=ctx.createOscillator();o.type=sd.bassWave;o.frequency.value=f;o.detune.value=s*sd.bassDetune;
    const og=ctx.createGain();og.gain.value=.45;o.connect(og).connect(lp);o.start(t);o.stop(end)});
  const sub=ctx.createOscillator(),sg=ctx.createGain();sub.frequency.value=f;sg.gain.value=.55;sub.connect(sg).connect(g);sub.start(t);sub.stop(end);
  const cut=sd.bassCut+S.wobble*1100;
  lp.frequency.setValueAtTime(cut+sd.bassEnv,t);lp.frequency.setTargetAtTime(cut,t+.005,sd.bassDecay);
  if(S.wobble>.01){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=S.bpm/60*(w||2);lg.gain.value=S.wobble*1600;
    l.connect(lg).connect(lp.frequency);l.start(t);l.stop(end)}
  lp.connect(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*.42,t+.005);g.gain.setValueAtTime(v*.42,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.05);
  g.connect(musicBus);
}
// Lead notes come from leadvoice.js, built from S.synth (the Lead synth panel).
// Mono mode: a note that starts as the last one ends (or overlaps it) glides on from it instead of restarting.
let lastLeadF=440,monoLead=null;
function lead(t,f,dur,v){
  lastLeadF=f;const p=S.synth;
  if(p.mono==='mono'&&monoLead&&monoLead.p===p&&monoLead.end>t-.06&&monoLead.start<t){monoLead.v.glide(f,t,p.glide);monoLead.v.release(t+dur);monoLead.end=t+dur;return}
  const v1=startLead(ctx,leadOut,p,t,f,v);v1.release(t+dur);monoLead=p.mono==='mono'?{v:v1,p,start:t,end:t+dur}:null;
}
function pad(t,freqs,dur){
  const g=ctx.createGain(),lp=ctx.createBiquadFilter(),a=dur<.4?.01:Math.min(.35,dur*.25),end=t+dur+.7;lp.frequency.value=S.sound.padCut;
  freqs.forEach(f=>[-9,9].forEach(dt=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=dt;o.connect(lp);o.start(t);o.stop(end)}));
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+a);g.gain.setValueAtTime(.06,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.6);
  lp.connect(g).connect(padOut);
}
const chordFreqs=r=>[0,2,4].map(k=>mtof(bassBase()+24+semis(r+k)));

/* ---------- arrangement + scheduler ---------- */
// Sections come from S.sections (edited in the Arrangement panel). Intro keeps the filter dark,
// Build sweeps it open and ends on a snare roll.
function section(bar){const s=Theory.sectionAt(bar,S.sections);if(!s)return null;
  return{...s,set:new Set(s.tracks),roll:s.build&&s.bars>1&&s.b===s.bars-1}}
const firstSec=()=>S.arrange?(S.sections.find(s=>s.bars)?.name||'Loop'):'Loop';
function cutoffAt(bar,st){const c=cutHz(),s=S.arrange&&section(bar);if(!s)return c;
  if(s.dark)return Math.min(c,900);if(s.build)return 250*Math.pow(c/250,(s.b*16+st)/(s.bars*16));return c}

let playing=false,step=0,bar=0,nextT=0,timer=null;const q=[];
function scheduleStep(st,t,bar){
  const P=S.pat,sec=S.arrange?section(bar):null,on=id=>!S.mute[id]&&(!sec||sec.set.has(id));
  const sd=60/S.bpm/4,r=S.prog[bar%S.prog.length];
  masterFilter.frequency.setTargetAtTime(cutoffAt(bar,st),t,.03);
  if(on('kick')&&P.kick[st]&&!(sec?.roll&&st>=8))kick(t,P.kick[st]);
  if(sec?.roll&&!S.mute.clap){if(st>=8||st%2===0)clap(t,.35+st/24)}
  else if(on('clap')&&P.clap[st])clap(t,P.clap[st]);
  if(on('ohat')&&P.ohat[st])hat(t,P.ohat[st],true);else if(on('hat')&&P.hat[st])hat(t,P.hat[st],false);
  const b=P.bass[st];if(b&&on('bass'))bass(t,mtof(bassBase()+semis(r+b.d)),b.len*sd*.92,b.v,b.w);
  const l=P.lead[st];if(l&&on('lead'))lead(t,mtof(leadNote(r+l.d)),l.len*sd*.9,l.v);
  if(P.pad[st]&&on('pad')){let nx=st+1;while(nx<16&&!P.pad[nx])nx++;pad(t,chordFreqs(r),(nx-st)*sd*.97)}
  q.push({st,bar,t,sec:sec?.name});
}
function tick(){
  while(nextT<ctx.currentTime+.12){
    scheduleStep(step,nextT,bar);
    const spb=60/S.bpm/4,sw=S.swing*.33;nextT+=step%2===0?spb*(1+sw):spb*(1-sw);
    if(++step===16){step=0;bar++}
  }
}
function start(){
  if(!ctx)initAudio();ctx.resume();
  playing=true;step=0;bar=0;nextT=ctx.currentTime+.06;q.length=0;timer=setInterval(tick,25);tick();
  $('#play').classList.add('on');$('#play').textContent='■ Stop';
}
function stop(){
  playing=false;clearInterval(timer);q.length=0;setPH(-1);
  $('#play').classList.remove('on');$('#play').textContent='▶ Play';
  $('#barN').textContent='1';$('#secN').textContent=firstSec();showChord(-1);
  if(masterFilter)masterFilter.frequency.setTargetAtTime(cutHz(),ctx.currentTime,.05);
}

/* ---------- UI ---------- */
const colCells=Array.from({length:16},()=>[]);
function buildGrid(){
  const g=$('#grid');g.innerHTML='';
  TRACKS.forEach(tr=>{
    const row=document.createElement('div');row.className='row';row.id='row-'+tr.id;row.style.setProperty('--c',`var(--${tr.id})`);
    row.innerHTML=`<div class="lab"><button class="mute" data-t="${tr.id}">${tr.name}</button><button class="dice" data-t="${tr.id}" aria-label="Reroll ${tr.name}">⟳</button></div>
      <div class="cells" data-t="${tr.id}">${Array.from({length:16},(_,i)=>`<button class="cell${(i>>2)%2?' alt':''}" data-i="${i}" aria-label="${tr.name} step ${i+1}"><i></i></button>`).join('')}</div>`;
    g.appendChild(row);
    row.querySelectorAll('.cell').forEach((c,i)=>colCells[i].push(c));
  });
  const s=document.createElement('div');s.className='steps';s.innerHTML='<span></span><div>'+Array.from({length:16},(_,i)=>`<span>${i%4===0?i/4+1:'·'}</span>`).join('')+'</div>';g.appendChild(s);
}
function renderTrack(id){
  const tr=TRACKS.find(t=>t.id===id),cells=document.querySelectorAll(`#row-${id} .cell`),a=S.pat[id];
  $('#row-'+id).classList.toggle('muted',!!S.mute[id]);
  if(tr.type==='drum'){cells.forEach((c,i)=>{c.className='cell'+((i>>2)%2?' alt':'')+(a[i]?(a[i]<.75?' soft':' on'):'')});return}
  let tail=0;cells.forEach((c,i)=>{const n=a[i];c.className='cell'+((i>>2)%2?' alt':'')+(sel&&sel.id===id&&sel.i===i?' sel':'');
    if(n){c.classList.add('on','mel');c.querySelector('i').style.setProperty('--y',(85-Math.max(0,Math.min(1,(n.d+3)/13))*75)+'%');tail=n.len-1}
    else if(tail>0){c.classList.add('tail');tail--}});
}
const renderAll=()=>TRACKS.forEach(t=>renderTrack(t.id));
let lastPH=-1;function setPH(i){if(lastPH>=0)colCells[lastPH].forEach(c=>c.classList.remove('ph'));if(i>=0)colCells[i].forEach(c=>c.classList.add('ph'));lastPH=i}
function renderProg(){
  $('#prog').innerHTML=S.prog.map((r,i)=>`<select data-i="${i}" aria-label="Bar ${i+1} chord">${[0,1,2,3,4,5,6].map(d=>
    `<option value="${d}"${d===((r%7)+7)%7?' selected':''}>${chordName(d)} · ${roman(d)}</option>`).join('')}</select>`).join('')+
    `<button class="pm" data-n="-1" aria-label="Fewer bars"${S.prog.length<2?' disabled':''}>−</button><button class="pm" data-n="1" aria-label="More bars"${S.prog.length>7?' disabled':''}>+</button>`;
}
function showChord(i){$('#prog').querySelectorAll('select').forEach((s,k)=>s.classList.toggle('now',k===i))}

/* note editor: pick pitch, length, level and wobble for the selected bass/lead step */
let sel=null;const lastD={bass:0,lead:0};
const DEG=['Root','2nd','3rd','4th','5th','6th','7th'];
function degLabel(d){const i=((d%7)+7)%7,o=Math.floor(d/7);return DEG[i]+(o>0?' ↑':o<0?' ↓':'')}
function renderEditor(){
  const ed=$('#noteEd'),n=sel&&S.pat[sel.id][sel.i];
  if(!n){sel=null;ed.hidden=true;return}
  let nx=sel.i+1;while(nx<16&&!S.pat[sel.id][nx])nx++;
  const tr=TRACKS.find(t=>t.id===sel.id),bar1=NOTE[((S.key+semis(S.prog[0]+n.d))%12+12)%12];
  ed.hidden=false;ed.style.setProperty('--c',`var(--${sel.id})`);
  ed.innerHTML=`<span class="lbl ed-t">${tr.name} · step ${sel.i+1}</span>
    <div class="field"><span class="lbl">Pitch</span><button class="pm" data-a="d" data-n="-1" aria-label="Lower"${n.d<=-7?' disabled':''}>−</button><output>${degLabel(n.d)} <small>${bar1} in bar 1</small></output><button class="pm" data-a="d" data-n="1" aria-label="Higher"${n.d>=14?' disabled':''}>+</button></div>
    <div class="field"><span class="lbl">Length</span><button class="pm" data-a="len" data-n="-1" aria-label="Shorter"${n.len<=1?' disabled':''}>−</button><output>${n.len} step${n.len>1?'s':''}</output><button class="pm" data-a="len" data-n="1" aria-label="Longer"${sel.i+n.len>=nx?' disabled':''}>+</button></div>
    <div class="field"><span class="lbl">Level</span><button class="btn sm" data-a="v" aria-pressed="${n.v>=.95}">${n.v>=.95?'Loud':'Soft'}</button></div>
    ${sel.id==='bass'?`<div class="field"><span class="lbl">Wobble</span><select data-a="w" aria-label="Wobble rate">${[1,2,3,4,6].map(w=>`<option value="${w}"${(n.w||2)===w?' selected':''}>×${w}</option>`).join('')}</select></div>`:''}
    <button class="btn sm" data-a="del">Delete</button>`;
}
function editNote(a,val){
  const n=S.pat[sel.id][sel.i];
  if(a==='del'){S.pat[sel.id][sel.i]=null;sel=null}
  else if(a==='d'){n.d=Math.max(-7,Math.min(14,n.d+val));lastD[sel.id]=n.d}
  else if(a==='len'){let nx=sel.i+1;while(nx<16&&!S.pat[sel.id][nx])nx++;n.len=Math.max(1,Math.min(nx-sel.i,n.len+val))}
  else if(a==='v')n.v=n.v>=.95?.7:1;
  else if(a==='w')n.w=val;
  const id=sel?.id??null,i=sel?.i;renderEditor();save();
  if(id){renderTrack(id);if(a!=='w')preview(id,i)}else renderAll();
}

/* arrangement panel: bars per section and which tracks play in each */
function renderArr(){
  $('#arrRows').innerHTML=S.sections.map((s,k)=>`<div class="sec" data-k="${k}">
    <div class="field"><span class="sec-n">${s.name}</span><select data-k="${k}" aria-label="${s.name} length">${[0,1,2,4,8,16].map(b=>`<option value="${b}"${b===s.bars?' selected':''}>${b} bar${b===1?'':'s'}</option>`).join('')}</select></div>
    <div class="sec-t">${TRACKS.map(t=>`<button class="tchip" style="--c:var(--${t.id})" data-k="${k}" data-t="${t.id}" aria-pressed="${s.tracks.includes(t.id)}">${t.name}</button>`).join('')}</div></div>`).join('');
}

function buildStyles(){
  $('#styles').innerHTML=Object.entries(STYLES).map(([k,v])=>`<button class="chip" data-s="${k}" aria-pressed="${k===S.style}">${v.label}</button>`).join('');
}
const MAC=[
  {k:'bpm',label:'Tempo',min:70,max:180,step:1,fmt:v=>v+' bpm'},
  {k:'swing',label:'Swing',min:0,max:.6,step:.01,fmt:v=>Math.round(v/.6*100)+'%'},
  {k:'cutoff',label:'Filter',min:0,max:1,step:.005,fmt:()=>{const h=cutHz();return h>=1000?(h/1000).toFixed(1)+' kHz':Math.round(h)+' Hz'}},
  {k:'wobble',label:'Wobble',min:0,max:1,step:.01,fmt:v=>Math.round(v*100)+'%'},
  {k:'space',label:'Reverb',min:0,max:1,step:.01,fmt:v=>Math.round(v*100)+'%'},
  {k:'echo',label:'Delay',min:0,max:.8,step:.01,fmt:v=>Math.round(v/.8*100)+'%'},
  {k:'vol',label:'Volume',min:0,max:1,step:.01,fmt:v=>Math.round(v*100)+'%'}];
function buildMacros(){
  $('#macros').innerHTML=MAC.map(m=>`<label class="mac" for="m-${m.k}"><header><span class="lbl">${m.label}</span><output id="o-${m.k}"></output></header>
    <input type="range" id="m-${m.k}" data-k="${m.k}" min="${m.min}" max="${m.max}" step="${m.step}"></label>`).join('');
}
function syncMacros(){MAC.forEach(m=>{$('#m-'+m.k).value=S[m.k];$('#o-'+m.k).textContent=m.fmt(S[m.k])});$('#bpmN').textContent=S.bpm}
function applyAudio(){if(!ctx)return;const t=ctx.currentTime;
  masterGain.gain.setTargetAtTime(S.vol,t,.02);revIn.gain.setTargetAtTime(S.space,t,.02);delIn.gain.setTargetAtTime(S.echo,t,.02);
  delay.delayTime.setTargetAtTime(60/S.bpm*.75,t,.05);if(!playing||!S.arrange)masterFilter.frequency.setTargetAtTime(cutHz(),t,.02)}
function syncTop(){
  $('#key').value=S.key;$('#scale').value=S.scale;$('#arrange').setAttribute('aria-pressed',S.arrange);
  document.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.s===S.style));
  if(!playing)$('#secN').textContent=firstSec();
  $('#arr').classList.toggle('off',!S.arrange);
}
function ensureAudio(){if(!ctx)initAudio();ctx.resume();return ctx.currentTime+.03}
function audition(){if(playing)return;const t=ensureAudio();lead(t,mtof(leadNote(S.prog[0])),.32,1)}
// Try: a short phrase over the first chord, so you hear the sound in context.
function tryPhrase(){if(playing)return;const t=ensureAudio(),r=S.prog[0],sd=60/S.bpm/4;
  pad(t,chordFreqs(r),sd*14);[[0,0,2],[2,2,1],[4,3,1],[7,4,2],[4,6,2],[2,8,1],[0,9,5]].forEach(([d,st,len])=>lead(t+st*sd*1.5,mtof(leadNote(r+d)),len*sd*1.4,st?.85:1))}
/* lead synth panel (synthpanel.js); the pop-out Synth page edits the same S.synth through localStorage */
const synthPanel=createSynthPanel($('#synth'),{model:()=>S,persist:()=>save(),audition,tryPhrase,noteHz:()=>mtof(leadNote(S.prog[0])),
  analyser:()=>leadAn||null,lastHz:()=>lastLeadF,sampleRate:()=>ctx?ctx.sampleRate:44100});
const renderSynth=()=>synthPanel.render();
$('#synPop').onclick=()=>{save();window.open('synth.html','sidechain-synth')};
window.addEventListener('storage',e=>{
  if(e.key==='sidechain-presets')return synthPanel.renderHead();
  if(e.key!=='sidechain-v1'||!e.newValue)return;
  try{const n=JSON.parse(e.newValue);if(n.synth&&JSON.stringify(n.synth)!==JSON.stringify(S.synth)){S.synth=Synth.normalize(n.synth);S.synthId=n.synthId;renderSynth()}}catch(err){}
});

function renderEverything(){renderAll();renderProg();renderEditor();renderArr();renderSynth();syncMacros();syncTop();applyAudio();save()}

$('#key').innerHTML=NOTE.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
$('#scale').innerHTML=Object.keys(SCALES).map(s=>`<option>${s}</option>`).join('');
buildStyles();buildGrid();buildMacros();renderEverything();

$('#midi').onclick=()=>exportMidi(S,{semis,bassBase,leadOct:12*S.synth.oct});
$('#play').onclick=()=>playing?stop():start();
$('#gen').onclick=()=>{S=fresh(S.style,S.key,true);sel=null;renderEverything()};
$('#arrange').onclick=()=>{S.arrange=!S.arrange;if(playing){bar=0}renderEverything()};
$('#styles').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;S=fresh(b.dataset.s,S.key);sel=null;renderEverything()};
$('#prog').onchange=e=>{const i=+e.target.dataset.i;S.prog[i]=+e.target.value;renderProg();renderEditor();save();
  if(ctx&&!playing){ctx.resume();pad(ctx.currentTime+.01,chordFreqs(S.prog[i]),.5)}};
$('#prog').onclick=e=>{const b=e.target.closest('.pm');if(!b)return;
  if(+b.dataset.n>0)S.prog.push(S.prog[S.prog.length-1]);else S.prog.pop();renderProg();save()};
$('#noteEd').onclick=e=>{const b=e.target.closest('button[data-a]');if(b&&sel)editNote(b.dataset.a,+b.dataset.n||0)};
$('#noteEd').onchange=e=>{if(e.target.dataset.a==='w'&&sel)editNote('w',+e.target.value)};
$('#arrRows').onchange=e=>{const k=e.target.dataset.k;if(k==null)return;S.sections[k].bars=+e.target.value;if(playing)bar=0;syncTop();save()};
$('#arrRows').onclick=e=>{const b=e.target.closest('.tchip');if(!b)return;const s=S.sections[b.dataset.k],t=b.dataset.t;
  s.tracks=s.tracks.includes(t)?s.tracks.filter(x=>x!==t):[...s.tracks,t];b.setAttribute('aria-pressed',s.tracks.includes(t));save()};
$('#arrReset').onclick=()=>{S.sections=defaultSections();renderArr();syncTop();save()};
$('#key').onchange=e=>{S.key=+e.target.value;renderProg();renderEditor();save()};
$('#scale').onchange=e=>{S.scale=e.target.value;renderProg();renderEditor();save()};
$('#macros').oninput=e=>{const k=e.target.dataset.k;if(!k)return;S[k]=+e.target.value;syncMacros();applyAudio();save()};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|SELECT|BUTTON/.test(e.target.tagName)){e.preventDefault();playing?stop():start()}});

function preview(id,i){
  if(!ctx||playing)return;ctx.resume();const t=ctx.currentTime+.01,r=S.prog[0],sd=60/S.bpm/4,P=S.pat;
  ({kick:()=>kick(t,1),clap:()=>clap(t,1),hat:()=>hat(t,.7,false),ohat:()=>hat(t,.7,true),pad:()=>pad(t,chordFreqs(r),.4),
    bass:()=>bass(t,mtof(bassBase()+semis(r+P.bass[i].d)),sd*P.bass[i].len,1),lead:()=>lead(t,mtof(leadNote(r+P.lead[i].d)),sd*P.lead[i].len,1)})[id]();
}
$('#grid').onclick=e=>{
  const mute=e.target.closest('.mute'),dice=e.target.closest('.dice'),cell=e.target.closest('.cell');
  if(mute){const id=mute.dataset.t;S.mute[id]=!S.mute[id];renderTrack(id);save();return}
  if(dice){const id=dice.dataset.t;S.pat[id]=STYLES[S.style].gen()[id];renderTrack(id);renderEditor();save();return}
  if(!cell)return;
  const id=cell.parentElement.dataset.t,i=+cell.dataset.i,a=S.pat[id],tr=TRACKS.find(t=>t.id===id);
  if(tr.type==='drum'){a[i]=id==='pad'?(a[i]?0:1):(a[i]===0?1:a[i]>=.75?.5:0)}
  else{const prev=sel;
    // tap an empty step to add a note (at the last pitch you chose), tap a note to edit it, tap it again to delete
    if(a[i]&&prev&&prev.id===id&&prev.i===i){a[i]=null;sel=null}
    else{if(!a[i]){for(let j=i-1;j>=0;j--)if(a[j]){if(j+a[j].len>i)a[j].len=i-j;break}a[i]=note(lastD[id],1,1)}
      sel={id,i}}
    if(prev&&prev.id!==id)renderTrack(prev.id);renderEditor()}
  renderTrack(id);save();if(a[i])preview(id,i);
};

/* ---------- playhead + scope ---------- */
const cv=$('#scope'),cx=cv.getContext('2d');let wave;
function draw(){
  requestAnimationFrame(draw);synthPanel.tick();
  if(playing&&ctx){let cur=null;while(q.length&&q[0].t<=ctx.currentTime)cur=q.shift();
    if(cur){setPH(cur.st);if(cur.st===0||lastBar!==cur.bar){lastBar=cur.bar;$('#barN').textContent=cur.bar+1;$('#secN').textContent=cur.sec||'Loop';showChord(cur.bar%S.prog.length)}}}
  const dpr=devicePixelRatio||1,w=cv.clientWidth*dpr,h=cv.clientHeight*dpr;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
  cx.clearRect(0,0,w,h);cx.lineWidth=2*dpr;cx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--bass');
  cx.beginPath();
  if(analyser&&playing){wave=wave||new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(wave);
    for(let i=0;i<wave.length;i++){const x=i/(wave.length-1)*w,y=h/2+(wave[i]-128)/128*h*.9;i?cx.lineTo(x,y):cx.moveTo(x,y)}}
  else{cx.moveTo(0,h/2);cx.lineTo(w,h/2)}
  cx.stroke();
}
let lastBar=-1;draw();
