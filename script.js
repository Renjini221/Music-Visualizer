const $ = id => document.getElementById(id);
const dropScreen = $('drop-screen');
const vizScreen  = $('viz-screen');
const dropZone   = $('drop-zone');
const fileInput  = $('file-input');
const canvas     = $('c');
const ctx        = canvas.getContext('2d');
const audio      = $('audio');
 
const bgMap = { black:'#06060a', darkblue:'#03060f', purple:'#05020e', void:'#000000' };
 
let ac, analyser, freqData, timeData;
let peaks, peakHold;
let animId, scheme = 'spectrum';
let rotAngle = 0;
let waterfallBuf = [];
 

let FX = { glow:true, trail:true, peak:false, mirror:false, grid:false, pulse:false, rotate:false };
   

let bpmTimes=[],lastBeatVol=0,detectedBPM=0,beatFlash=0,flashAlpha=0;

function resize() {
  canvas.width  = canvas.parentElement.offsetWidth  || 800;
  canvas.height = canvas.parentElement.offsetHeight || 400;
  waterfallBuf  = [];
}
window.addEventListener('resize', resize);
 
dropZone.addEventListener('click',    () => fileInput.click());
$('new-btn').addEventListener('click',() => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave',() => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) filo(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) filo(fileInput.files[0]); });
 
function filo(file) {
  audio.src = URL.createObjectURL(file);
  $('track-name').textContent = file.name.replace(/\.[^.]+$/, '').toUpperCase();
  dropScreen.style.display = 'none';
  vizScreen.style.display  = 'flex';
  bpmTimes=[];
  detectedBPM=0;
  if(window.logTrack) logTrack(file.name);
  setTimeout(() => { resize(); if (!animId) draw(); }, 60);
}
 

function setaud() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const src = ac.createMediaElementSource(audio);
  analyser = ac.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = parseFloat($('smooth').value);
  freqData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.fftSize);
  peaks    = new Float32Array(analyser.frequencyBinCount);
  peakHold = new Int32Array(analyser.frequencyBinCount);
  src.connect(analyser);
  analyser.connect(ac.destination);
  if (ac.state === 'suspended') ac.resume();
}
audio.addEventListener('play', setaud);
 

document.querySelectorAll('.sw').forEach(s => s.addEventListener('click', () => {
  document.querySelectorAll('.sw').forEach(x => x.classList.remove('on'));
  s.classList.add('on'); scheme = s.dataset.s;
}));
 
function sli(id, outId, decimals) {
  const el = $(id), out = $(outId);
  el.addEventListener('input', () => { out.textContent = parseFloat(el.value).toFixed(decimals); });
}
sli('bar-count','sv-bars',0);
sli('gain','sv-gain',1);
sli('smooth','sv-smooth',2);
sli('line-w','sv-lw',1);
 
$('bar-count').addEventListener('input', () => { $('s-bars').textContent = $('bar-count').value; });
$('smooth').addEventListener('input', () => { if (analyser) analyser.smoothingTimeConstant = parseFloat($('smooth').value); });
$('mode-sel').addEventListener('change', () => { $('s-mode').textContent = $('mode-sel').value.toUpperCase(); waterfallBuf = []; rotAngle = 0; });
 
['glow','trail','peak','mirror','grid','pulse','rotate'].forEach(k => {
  const btn = $('fx-' + k);
  btn.addEventListener('click', () => { FX[k] = !FX[k]; btn.classList.toggle('on'); });
});
 

function col(t, alpha) {
  alpha = alpha === undefined ? 1 : alpha;
  switch(scheme) {
    case 'spectrum': return `hsla(${Math.round(t*300)},90%,62%,${alpha})`;
    case 'purple':   return `hsla(${265+t*65},82%,${50+t*22}%,${alpha})`;
    case 'cyan':     return `hsla(${188+t*28},88%,${45+t*28}%,${alpha})`;
    case 'fire':     return `hsla(${Math.round(t*55)},92%,${32+t*38}%,${alpha})`;
    case 'mint':     return `hsla(${148+t*32},78%,${38+t*32}%,${alpha})`;
    case 'rose':     return `hsla(${342+t*28},87%,${50+t*22}%,${alpha})`;
    case 'mono':     return `hsla(220,12%,${25+t*65}%,${alpha})`;
    case 'gold':     return `hsla(${32+t*28},92%,${38+t*36}%,${alpha})`;
    case 'neon':     return `hsla(${100+t*220},95%,${55+t*15}%,${alpha})`;
  }
}
 

function draw() {
  animId = requestAnimationFrame(draw);
  const W = canvas.width, H = canvas.height;
  if (!W || !H) return;
 
  const mode  = $('mode-sel').value;
  const gain  = parseFloat($('gain').value);
  const nbars = parseInt($('bar-count').value);
  const lw    = parseFloat($('line-w').value);
  const bg    = bgMap[$('bg-sel').value] || '#06060a';
 

  if (analyser) {
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);
  } else {
    if (!freqData) { freqData = new Uint8Array(256); timeData = new Uint8Array(256).fill(128); peaks = new Float32Array(256); peakHold = new Int32Array(256); }
  }
 
  
  const fLen = freqData.length;
  const bins = new Float32Array(nbars);
  for (let i = 0; i < nbars; i++) {
    const lo = Math.floor(Math.pow(i / nbars, 1.5) * fLen);
    const hi = Math.max(lo+1, Math.floor(Math.pow((i+1)/nbars, 1.5) * fLen));
    let sum = 0;
    for (let j = lo; j < hi; j++) sum += freqData[j];
    bins[i] = Math.min(1, (sum / (hi - lo) / 255) * gain);
  }
  const drawBins = FX.mirror ? Array.from(bins).reverse() : bins;
 
  const bassEnd=Math.floor(nbars*0.15);
  const bassAvg=bins.slice(0,bassEnd).reduce((a,b)=>a+b,0) /bassEnd;
  
  const avgVol = bins.reduce((a,b)=>a+b,0)/nbars*100;
  let dIdx=0, dVal=0;
  for (let i=0;i<freqData.length;i++) if(freqData[i]>dVal){dVal=freqData[i];dIdx=i;}
  const sr = ac ? ac.sampleRate : 44100;
  const domHz = Math.round(dIdx * sr / (analyser ? analyser.fftSize : 2048));
  $('s-freq').textContent = domHz < 1000 ? domHz+'Hz' : (domHz/1000).toFixed(1)+'k';
  $('s-vol').textContent  = Math.round(avgVol)+'%';
  $('s-mode').textContent = mode.toUpperCase();

becheck(bassAvg);
flashAlpha=Math.max(0,flashAlpha-0.04);
beatFlash=Math.max(0,beatFlash-0.08);
 
if(window.tick) tick();
if(window.volcheck) volcheck(avgVol);

  if (peaks && peaks.length === nbars) {
    for (let i=0;i<nbars;i++) {
      if (bins[i] > peaks[i]) { peaks[i]=bins[i]; peakHold[i]=55; }
      else if (peakHold[i]>0) peakHold[i]--;
      else peaks[i] = Math.max(0, peaks[i]-0.006);
    }
  }
 
  
  if (mode === 'waterfall') {
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  } else if (FX.trail) {
    ctx.fillStyle = bg + 'c8'; ctx.fillRect(0,0,W,H);
  } else {
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  }
 
  if (FX.pulse && avgVol > 10) {
    const intensity = avgVol / 100 * 0.12;
    const c = col(0.5, intensity);
    const grd = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.6);
    grd.addColorStop(0, c); grd.addColorStop(1,'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
  }
 
  
  if (FX.grid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5;
    for (let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for (let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  }
 
 
  ctx.shadowBlur = FX.glow ? 20 : 0;
 
  
  if (FX.rotate && (mode==='radial'||mode==='radialsolid'||mode==='starburst')) {
    rotAngle += 0.003;
    ctx.save();
    ctx.translate(W/2, H/2);
    ctx.rotate(rotAngle);
    ctx.translate(-W/2, -H/2);
  }
 
  
  if (mode === 'bars') {
    const gap = Math.max(0.5, W/nbars * 0.12);
    const bw = W/nbars - gap;
    for (let i=0;i<nbars;i++) {
      const v = drawBins[i];
      const h = v * H * 0.95;
      const x = i*(bw+gap);
      const c = col(i/nbars);
      ctx.shadowColor = c; ctx.fillStyle = c;
      ctx.fillRect(x, H-h, bw, h);
      if (FX.peak && peaks[i]>0.02) {
        ctx.fillStyle='rgba(255,255,255,0.9)';
        ctx.fillRect(x, H-peaks[i]*H*0.95-2, bw, 2);
      }
    }
 
  } else if (mode === 'fatbars') {
    const bw = W / nbars;
    for (let i=0;i<nbars;i++) {
      const v = drawBins[i];
      const h = v * H * 0.95;
      const x = i * bw;
      const c = col(i/nbars);
      ctx.shadowColor = c; ctx.fillStyle = c;
      ctx.fillRect(x, H-h, bw-1, h);
      if (FX.peak && peaks[i]>0.02) {
        ctx.fillStyle='rgba(255,255,255,0.85)';
        ctx.fillRect(x, H-peaks[i]*H*0.95-3, bw-1, 3);
      }
    }
 
  } else if (mode === 'mirror') {
    const gap = Math.max(0.5, W/nbars*0.1);
    const bw = W/nbars - gap;
    for (let i=0;i<nbars;i++) {
      const v = drawBins[i];
      const h = v*H*0.47;
      const x = i*(bw+gap);
      const c = col(i/nbars);
      ctx.shadowColor = c; ctx.fillStyle = c;
      ctx.fillRect(x, H/2-h, bw, h);
      ctx.fillStyle = col(i/nbars, 0.45);
      ctx.fillRect(x, H/2, bw, h);
      if (FX.peak && peaks[i]>0.02) {
        ctx.fillStyle='rgba(255,255,255,0.85)';
        const ph = peaks[i]*H*0.47;
        ctx.fillRect(x, H/2-ph-2, bw, 2);
        ctx.fillRect(x, H/2+ph,   bw, 2);
      }
    }
 
  } else if (mode === 'wave' || mode === 'dualwave' || mode === 'filledwave') {
    const grad = ctx.createLinearGradient(0,0,W,0);
    for(let s=0;s<=10;s++) grad.addColorStop(s/10, col(s/10));
 
    const drawWave = (yOff, amp, alpha, filled) => {
      ctx.beginPath();
      for(let i=0;i<nbars;i++){
        const x = (i/(nbars-1))*W;
        const y = H/2 + yOff - drawBins[i]*amp;
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      if (filled) {
        ctx.lineTo(W, H/2+yOff); ctx.lineTo(0, H/2+yOff); ctx.closePath();
        ctx.fillStyle = col(0.5, alpha*0.25); ctx.fill();
      }
      ctx.shadowColor = col(0.5);
      ctx.strokeStyle = grad; ctx.lineWidth = lw*alpha; ctx.globalAlpha = alpha; ctx.stroke();
      ctx.globalAlpha = 1;
    };
 
    if (mode==='wave') drawWave(0, H*0.44, 1, false);
    if (mode==='dualwave') { drawWave(0, H*0.44, 1, false); drawWave(0, -H*0.44, 0.4, false); }
    if (mode==='filledwave') { drawWave(0, H*0.44, 1, true); drawWave(0, -H*0.44, 0.5, true); }
 // idk why this works but it does
  } else if (mode === 'radial' || mode === 'radialsolid') {
    const cx=W/2, cy=H/2;
    const r0 = Math.min(W,H)*0.12;
    const r1 = Math.min(W,H)*0.45;
 
    if (mode==='radialsolid') {
      ctx.beginPath();
      for(let i=0;i<=nbars;i++){
        const v = drawBins[i%nbars];
        const a = (i/nbars)*Math.PI*2 - Math.PI/2;
        const r = r0 + v*(r1-r0);
        const x = cx+Math.cos(a)*r, y = cy+Math.sin(a)*r;
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.closePath();
      const rg = ctx.createRadialGradient(cx,cy,r0,cx,cy,r1);
      rg.addColorStop(0, col(0.2, 0.85)); rg.addColorStop(1, col(0.8, 0.15));
      ctx.shadowColor = col(0.5);
      ctx.fillStyle = rg; ctx.fill();
      ctx.strokeStyle = col(0.6); ctx.lineWidth = lw; ctx.stroke();
    } else {
      for(let i=0;i<nbars;i++){
        const v = drawBins[i];
        const a = (i/nbars)*Math.PI*2 - Math.PI/2;
        const outer = r0 + v*(r1-r0);
        const c = col(i/nbars);
        ctx.shadowColor = c;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a)*r0, cy+Math.sin(a)*r0);
        ctx.lineTo(cx+Math.cos(a)*outer, cy+Math.sin(a)*outer);
        ctx.strokeStyle = c;
        ctx.lineWidth = Math.max(1, (Math.PI*2*r1/nbars)*0.72);
        ctx.stroke();
      }
    }
 
  } else if (mode === 'starburst') {
    const cx=W/2, cy=H/2;
    const r0 = Math.min(W,H)*0.04;
    const r1 = Math.min(W,H)*0.48;
    for(let i=0;i<nbars;i++){
      const v = drawBins[i];
      const a = (i/nbars)*Math.PI*2;
      const r = r0 + v*(r1-r0);
      const c = col(i/nbars);
      ctx.shadowColor = c; ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(a)*r0, cy+Math.sin(a)*r0);
      ctx.lineTo(cx+Math.cos(a)*r,  cy+Math.sin(a)*r);
      ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.arc(cx,cy,r0,0,Math.PI*2);
    ctx.strokeStyle = col(0.5, 0.5); ctx.lineWidth = 1; ctx.stroke();
 
  } else if (mode === 'lines') {
    const rowH = H / nbars;
    for(let i=0;i<nbars;i++){
      const v = drawBins[i];
      const y = i*rowH + rowH/2;
      const w = v*W*0.97;
      const c = col(i/nbars);
      ctx.shadowColor = c; ctx.fillStyle = c;
      ctx.fillRect(0, y-rowH*0.36, w, rowH*0.72);
    }
 
  } else if (mode === 'dots') {
    const cols = Math.max(4, Math.round(Math.sqrt(nbars * W/H)));
    const rows = Math.ceil(nbars/cols);
    const cw = W/cols, ch = H/rows;
    for(let i=0;i<nbars;i++){
      const v = drawBins[i];
      const col2 = i%cols, row = Math.floor(i/cols);
      const x = col2*cw+cw/2, y = row*ch+ch/2;
      const r = v * Math.min(cw,ch)*0.47;
      const c = col(i/nbars);
      ctx.shadowColor = c; ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x,y,Math.max(0.5,r),0,Math.PI*2); ctx.fill();
    }
 
  } else if (mode === 'blocks') {
    const cols = Math.max(4, Math.round(Math.sqrt(nbars * W/H)));
    const rows = Math.ceil(nbars/cols);
    const cw = W/cols, ch = H/rows;
    for(let i=0;i<nbars;i++){
      const v = drawBins[i];
      const col2 = i%cols, row = Math.floor(i/cols);
      ctx.fillStyle = col(i/nbars, 0.15 + v*0.85);
      ctx.fillRect(col2*cw+1, row*ch+1, cw-2, ch-2);
    }
 
  } else if (mode === 'scope') {
    const len = timeData.length;
    const grad = ctx.createLinearGradient(0,0,W,0);
    for(let s=0;s<=8;s++) grad.addColorStop(s/8, col(s/8));
    ctx.shadowColor = col(0.5);
   
    ctx.beginPath();
    for(let i=0;i<len;i++){
      const x = (i/len)*W;
      const y = H/2 + ((timeData[i]/128)-1)*H*0.44;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.strokeStyle = grad; ctx.lineWidth = lw; ctx.stroke();
   
    ctx.shadowBlur = 0; ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
 
  } else if (mode === 'waterfall') {
    waterfallBuf.unshift(Array.from(bins));
    if (waterfallBuf.length > H) waterfallBuf.length = H;
    const rh = Math.max(1, H/waterfallBuf.length);
    ctx.shadowBlur = 0;
    for(let r=0;r<waterfallBuf.length;r++){
      const row = waterfallBuf[r];
      const bw2 = W/row.length;
      for(let i=0;i<row.length;i++){
        const v = row[i];
        ctx.fillStyle = col(i/row.length, v*0.95);
        ctx.fillRect(i*bw2, r*rh, bw2+0.5, rh+0.5);
      }
    }
  }
 
  if (FX.rotate && (mode==='radial'||mode==='radialsolid'||mode==='starburst')) ctx.restore();
  ctx.shadowBlur = 0;
 
  if(flashAlpha>0){
    ctx.fillStyle=`rgba(255,255,255,${flashAlpha})`;
    ctx.fillRect(0,0,W,H);
  }
  const vBars = document.querySelectorAll('.vu-b');
  const v0 = avgVol;
  const vuColor = v0>75 ? '#f87171' : v0>45 ? '#fbbf24' : '#c084fc';
  [[0.65,1],[0.42,0.7],[0.28,0.5]].forEach(([frac,op],i) => {
    vBars[i].style.height   = Math.max(3, v0*frac*0.6)+'px';
    vBars[i].style.background = vuColor;
    vBars[i].style.opacity  = op;
  });
}
function becheck(bassVol){
  const now=performance.now();
  if(bassVol>0.6&&bassVol>lastBeatVol*1.3){
    bpmTimes.push(now);
    if(bpmTimes.length>8)bpmTimes.shift();
    if(bpmTimes.length>=4){
      const gaps=[];
      for(let i=1;i<bpmTimes.length;i++)
        gaps.push(bpmTimes[i]-bpmTimes[i-1]);
        const avg=gaps.reduce((a,b)=>a+b,0)/gaps.length;
        detectedBPM=Math.round(60000/avg);
        if(detectedBPM>40&&detectedBPM<220){
          $('s-bpm').textContent=detectedBPM;
          $('bpm-overlay').textContent=detectedBPM+' BPM';
        }
    }
    beatFlash=1;
    if(window.logBeat)logBeat(detectedBPM);
    $('bpm-overlay').classList.add('beat');
    setTimeout(()=>$('bpm-overlay').classList.remove('beat'),80);
    flashAlpha=0.18;

  }
  lastBeatVol=bassVol;
}
const modeList=[
  'bars','fatbars','mirror','wave','dualwave','filledwave',
  'radial','radialsolid','lines','dots','blocks','scope','waterfall','starburst'

];

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;

  switch(e.code){

    case'Space':{
    e.preventDefault();
    audio.paused?audio.play():audio.pause();
    break;
  }
     case 'ArrowRight':{
      const idx=(modeList.indexOf($('mode-sel').value)+1)%modeList.length;
      $('mode-sel').value=modeList[idx];
      $('mode-sel').dispatchEvent(new Event('change'));
      break;

     }
     case 'ArrowLeft':{
      const idx =(modeList.indexOf($('mode-sel').value)-1+modeList.length)%modeList.length;
      $('mode-sel').value=modeList[idx];
      $('mode-sel').dispatchEvent(new Event('change'));
      break;
     }
     case 'ArrowUp':{
     e.preventDefault();
    const g=Math.min(8,parseFloat($('gain').value)+0.5);
     $('gain').value=g;
     $('sv-gain').textContent=g.toFixed(1);
     break;
  }
    case 'ArrowDown':{
      e.preventDefault();
      const g=Math.max(0.5,parseFloat($('gain').value)-0.5);
      $('gain').value=g;
      $('sv-gain').textContent=g.toFixed(1);
      break;
     }
     case 'KeyG':
     FX.glow=!FX.glow;
     $('fx-glow').classList.toggle('on',FX.glow);
     break;

     case 'KeyT':
      FX.trail=!FX.trail;
      $('fx-trail').classList.toggle('on',FX.trail);
      break;

      case 'KeyP':
        FX.pulse=!FX.pulse;
        $('fx-pulse').classList.toggle('on',FX.pulse);
        break;

      case 'KeyK':
        FX.peak=!FX.peak;
        $('fx-peak').classList.toggle('on',FX.peak);
        break;
     
      case 'KeyX':
        FX.mirror=!FX.mirror;
        $('fx-mirror').classList.toggle('on',FX.mirror);
        break;
      case 'KeyR':
        FX.rotate= !FX.rotate;
        $('fx-rotate').classList.toggle('on',FX.rotate);
        break;
      case 'KeyS':
        snapt();
        break;  
      case 'KeyM':{
        const swatches=['spectrum','purple','cyan','fire','mint','rose','mono','gold','neon'];
        const idx=(swatches.indexOf(scheme)+1)%swatches.length;
        scheme=swatches[idx];
        document.querySelectorAll('.sw').forEach(s=>s.classList.remove('on'));
        document.querySelector(`.sw[data-s="${scheme}"]`).classList.add('on');
        break;
      }  

      default:{
        const n=parseInt(e.key);
        if(!isNaN(n)&&n>=0&&n<modeList.length){
          $('mode-sel').value=modeList[n];
          $('mode-sel').dispatchEvent(new Event('change'));
        }
        }
      }       
})
function toast(msg,dur=2000){
  const t=$('toast');
  t.textContent=msg;
  t.style.display='block';
  clearTimeout(t._tid);
  t._tid=setTimeout(()=>{t.style.display='none';},dur);
}
let mediaRec=null,recChunks=[],recStartTime=0,recTimerInterval=null;
function Rec(){
  if(!ac){
   toast('play audio first');
    return;
  }
  const stream=canvas.captureStream(60);
  const dest=ac.createMediaStreamDestination();
  analyser.connect(dest);
  dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  const mime=[
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ].find(m=>MediaRecorder.isTypeSupported(m))||'video/webm';
  mediaRec=new MediaRecorder(stream,{mimeType:mime});
  recChunks=[];
  mediaRec.ondataavailable=e=>{if(e.data.size>0)recChunks.push(e.data);};
  mediaRec.onstop=()=>{
    const blob=new Blob(recChunks,{type:mime});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=($('track-name').textContent||'viz')+'.webm';
    a.click();
    $('rec-badge').style.display='none';
    $('btn-rec').textContent='record';
    $('btn-rec').classList.remove('on');
    $('rec-timer').style.display='none';
    clearInterval(recTimerInterval);
    toast('Recording Saved');
  };
   mediaRec.start(100);
   recStartTime=Date.now();
   recTimerInterval=setInterval(()=>{
    const s=Math.floor((Date.now()- recStartTime)/1000);
    const m=Math.floor(s/60),sec=s%60;
    $('rec-timer').textContent=`${m}:${sec.toString().padStart(2,'0')}`;
   },500);
   $('rec-badge').style.display='block';
   $('btn-rec').textContent='stop';
   $('btn-rec').classList.add('on');
   $('rec-timer').style.display='inline';
   toast('Recording started');
   }
   function stopRec(){
    if(mediaRec&&mediaRec.state!=='inactive')mediaRec.stop();

   }
   $('btn-rec').addEventListener('click',()=>{
    mediaRec&&mediaRec.state==='recording'?stopRec():Rec();
   });
   function snap(){
    const a = document.createElement('a');
    a.href=canvas.toDataURL('image/png');
    a.download=($('track-name').textContent||'viz')+'.png';
    a.click();
    toast('snap saved')

   }
   $('btn-snap').addEventListener('click',snap);
