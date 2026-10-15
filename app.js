
const nf=new Intl.NumberFormat('bn-BD',{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat('bn-BD',{maximumFractionDigits:1});
const bn=n=>nf.format(n);
const ROAD=1.3; // সড়কপথের দূরত্ব = সরলরেখার দূরত্ব x ১.৩ (আনুমানিক)
const FAMILY=['মা','বাবা','ভাই','বোন','স্বামী/স্ত্রী','সন্তান'];
const FRIEND=['বন্ধু','দূরের বন্ধু'];
const relColor=r=>FAMILY.includes(r)?'var(--family)':FRIEND.includes(r)?'var(--friend)':'var(--other)';

// places for each mode
const places={
  bd:BD.map(([b,e,div,lat,lng])=>({key:b,label:b,sub:e+', '+div+' বিভাগ',lat,lng,tz:'Asia/Dhaka'})),
  world:WC.map(([n,c,lat,lng,tz])=>({key:n+', '+c,label:n+', '+c,lat,lng,tz}))
};
function findPlace(mode,txt){
  txt=(txt||'').trim().toLowerCase(); if(!txt) return null;
  const L=places[mode];
  return L.find(p=>p.key.toLowerCase()===txt)||L.find(p=>mode==='bd'&&p.sub.toLowerCase().startsWith(txt))||L.find(p=>p.key.toLowerCase().startsWith(txt))||null;
}
function nearest(mode,lat,lng){let best=null,bd=1e9;for(const p of places[mode]){const d=hav(lat,lng,p.lat,p.lng);if(d<bd){bd=d;best=p}}return {p:best,d:bd};}

function hav(a,b,c,d){const R=6371.0088,r=Math.PI/180;const x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function dur(h){
  const m=Math.round(h*60);
  if(m<1) return '১ মিনিটের কম';
  if(m<60) return bn(m)+' মিনিট';
  if(m<24*60){const hh=Math.floor(m/60),mm=m%60;return bn(hh)+' ঘণ্টা'+(mm?' '+bn(mm)+' মিনিট':'');}
  const dd=Math.floor(m/1440),hh=Math.round((m%1440)/60);return bn(dd)+' দিন'+(hh?' '+bn(hh)+' ঘণ্টা':'');
}
function tzOffsetMin(tz){try{const d=new Date();const a=new Date(d.toLocaleString('en-US',{timeZone:tz}));const u=new Date(d.toLocaleString('en-US',{timeZone:'UTC'}));return Math.round((a-u)/60000);}catch(e){return null}}
function localTime(tz){try{return new Intl.DateTimeFormat('bn-BD',{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(new Date())}catch(e){return ''}}

// settings and storage
const DEFAULTS={
  bd:{me:{label:'ঢাকা',lat:23.7115,lng:90.4111,tz:'Asia/Dhaka'},example:true,speeds:{road:40,walk:5},people:[
    {id:1,name:'মা',rel:'মা',label:'রাজশাহী',lat:24.3636,lng:88.6241,tz:'Asia/Dhaka'},
    {id:2,name:'বড় ভাই',rel:'ভাই',label:'চট্টগ্রাম',lat:22.335,lng:91.8325,tz:'Asia/Dhaka'},
    {id:3,name:'রাফি',rel:'বন্ধু',label:'সিলেট',lat:24.8998,lng:91.8710,tz:'Asia/Dhaka'},
    {id:4,name:'ফুফু',rel:'আত্মীয়',label:'খুলনা',lat:22.8456,lng:89.5403,tz:'Asia/Dhaka'}]},
  world:{me:{label:'Dhaka, Bangladesh',lat:23.7104,lng:90.4074,tz:'Asia/Dhaka'},example:true,speeds:{plane:800},people:[
    {id:1,name:'আপু',rel:'বোন',label:'London, United Kingdom',lat:51.5085,lng:-0.1257,tz:'Europe/London'},
    {id:2,name:'তানভীর',rel:'দূরের বন্ধু',label:'Toronto, Canada',lat:43.7001,lng:-79.4163,tz:'America/Toronto'},
    {id:3,name:'চাচা',rel:'আত্মীয়',label:'Dubai, United Arab Emirates',lat:25.0772,lng:55.3093,tz:'Asia/Dubai'},
    {id:4,name:'মামাতো ভাই',rel:'ভাই',label:'Kuala Lumpur, Malaysia',lat:3.1412,lng:101.6865,tz:'Asia/Kuala_Lumpur'}]}
};
const store={
  get(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
const state={bd:store.get('apon_bd')||structuredClone(DEFAULTS.bd),world:store.get('apon_world')||structuredClone(DEFAULTS.world)};
let mode=(location.hash==='#world')?'world':(store.get('apon_mode')||'bd');
const save=()=>{store.set('apon_'+mode,state[mode]);store.set('apon_mode',mode)};

// map
const svg=d3.select('#map'),g=svg.append('g');
const gLand=g.append('g'),gLines=g.append('g'),gPts=g.append('g');
let projection,path,W,H,zoom,curK=1;
const bdFeat=topojson.feature(BDTOPO,BDTOPO.objects[Object.keys(BDTOPO.objects)[0]]);
const wFeat=topojson.feature(WTOPO,WTOPO.objects.countries);

function setupMap(){
  if(mode==='bd'){W=600;H=700;projection=d3.geoMercator().fitExtent([[24,24],[W-24,H-24]],bdFeat);}
  else{W=960;H=500;projection=d3.geoNaturalEarth1().fitExtent([[8,8],[W-8,H-8]],{type:'Sphere'});}
  path=d3.geoPath(projection);
  svg.attr('viewBox',`0 0 ${W} ${H}`);
  gLand.selectAll('*').remove();
  if(mode==='world') gLand.append('path').attr('d',path({type:'Sphere'})).attr('fill','var(--sea)');
  gLand.selectAll('path.land').data((mode==='bd'?bdFeat:wFeat).features).join('path').attr('class','land')
    .attr('d',path).attr('fill','var(--land)').attr('stroke','var(--land-line)').attr('vector-effect','non-scaling-stroke').attr('stroke-width',.8);
  zoom=d3.zoom().scaleExtent([1,mode==='bd'?8:24]).translateExtent([[0,0],[W,H]]).on('zoom',e=>{g.attr('transform',e.transform);curK=e.transform.k;drawPoints();});
  svg.call(zoom).on('dblclick.zoom',null);
  svg.call(zoom.transform,d3.zoomIdentity);
}
function hot(){
  const S=state[mode];const pts=[S.me,...S.people].filter(Boolean);
  gLand.selectAll('path.land').attr('fill',f=>pts.some(p=>d3.geoContains(f,[p.lng,p.lat]))?'var(--land-hot)':'var(--land)');
}
function drawPoints(){
  const S=state[mode];const k=curK;
  const people=S.me?S.people:[];
  gLines.selectAll('path').data(people,d=>d.id).join('path').attr('class','line')
    .attr('d',d=>path({type:'LineString',coordinates:[[S.me.lng,S.me.lat],[d.lng,d.lat]]}))
    .attr('fill','none').attr('stroke',d=>relColor(d.rel)).attr('stroke-width',2.2).attr('vector-effect','non-scaling-stroke')
    .attr('stroke-dasharray',mode==='world'?'6 4':null).attr('stroke-linecap','round');
  const all=[...(S.me?[{...S.me,me:true,id:'me',name:'আমি'}]:[]),...S.people];
  const gs=gPts.selectAll('g.pt').data(all,d=>d.id).join(en=>{const gg=en.append('g').attr('class','pt');gg.append('circle');gg.append('text').attr('class','svg-label');return gg;});
  gs.attr('transform',d=>{const [x,y]=projection([d.lng,d.lat]);return `translate(${x},${y})`;});
  gs.select('circle').attr('r',d=>(d.me?7:5.5)/k).attr('fill',d=>d.me?'var(--me)':relColor(d.rel)).attr('stroke','var(--sea)').attr('stroke-width',2/k);
  gs.select('text').attr('font-size',d=>(d.me?15:13)/k).attr('stroke-width',3.5/k).each(function(d){
    const place=mode==='world'?d.label.split(',')[0]:d.label;
    const t=d3.select(this);t.selectAll('tspan').remove();
    t.append('tspan').attr('x',9/k).attr('y',-1/k).text(d.name);
    t.append('tspan').attr('class','svg-place').attr('x',9/k).attr('dy','1.15em').text(place);
  });
}

// picking on map
let picking=null;
svg.on('click',ev=>{
  if(!picking) return;
  const [x,y]=d3.pointer(ev,g.node());const ll=projection.invert([x,y]);if(!ll) return;
  const [lng,lat]=ll;
  if(mode==='bd'&&!bdFeat.features.some(f=>d3.geoContains(f,ll))){setPick(null);showErr(picking==='me'?'meErr':'pErr','বাংলাদেশের ভেতরে ক্লিক করুন। বিদেশের জায়গার জন্য "বিশ্ব" পাতা ব্যবহার করুন।');return;}
  const n=nearest(mode,lat,lng);
  const label=(n.d<8?'':'কাছেই: ')+(mode==='bd'?n.p.label:n.p.label.split(',')[0]+' এর কাছে');
  const place={label:n.d<8?n.p.label:(mode==='bd'?n.p.label+' জেলার কাছাকাছি':n.p.label.split(',')[0]+' এর কাছাকাছি'),lat:+lat.toFixed(4),lng:+lng.toFixed(4),tz:n.p.tz};
  if(picking==='me'){setMe(place);document.getElementById('meInput').value='';}
  else{pending=place;document.getElementById('pPlace').value='';showNow();}
  setPick(null);
});
function setPick(t){picking=t;document.getElementById('mapbox').classList.toggle('picking',!!t);const h=document.getElementById('pickhint');h.hidden=!t;
  h.textContent=t==='me'?'ম্যাপে আপনার জায়গায় ক্লিক করুন':'ম্যাপে আপনজনের জায়গায় ক্লিক করুন';
  if(t) document.getElementById('mapbox').scrollIntoView({behavior:'smooth',block:'nearest'});}
document.getElementById('mePick').onclick=()=>setPick(picking==='me'?null:'me');
document.getElementById('pPick').onclick=()=>setPick(picking==='p'?null:'p');
document.getElementById('zin').onclick=()=>svg.transition().duration(250).call(zoom.scaleBy,1.6);
document.getElementById('zout').onclick=()=>svg.transition().duration(250).call(zoom.scaleBy,1/1.6);
document.getElementById('zreset').onclick=()=>svg.transition().duration(250).call(zoom.transform,d3.zoomIdentity);

// forms
let pending=null;
function showErr(id,msg){document.getElementById(id).textContent=msg||'';}
function setMe(p){state[mode].me=p;showErr('meErr');save();render();}
document.getElementById('meInput').addEventListener('change',e=>{const p=findPlace(mode,e.target.value);
  if(!p){showErr('meErr',mode==='bd'?'এই নামে কোনো জেলা পাওয়া যায়নি। তালিকা থেকে বাছুন বা ম্যাপে ক্লিক করুন।':'এই শহর তালিকায় নেই। কাছের বড় শহর লিখুন বা ম্যাপে ক্লিক করুন।');return;}
  setMe({label:p.label,lat:p.lat,lng:p.lng,tz:p.tz});e.target.value='';});
document.getElementById('pPlace').addEventListener('change',e=>{pending=findPlace(mode,e.target.value);showErr('pErr');showNow();});
function showNow(){document.getElementById('pNow').innerHTML=pending?'বাছাই করা জায়গা: <b>'+esc(pending.label)+'</b>':'';}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
document.getElementById('addForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('pName').value.trim(),rel=document.getElementById('pRel').value;
  const typed=document.getElementById('pPlace').value;
  if(!pending&&typed) pending=findPlace(mode,typed);
  if(!name){showErr('pErr','নাম লিখুন।');return;}
  if(!pending){showErr('pErr',typed?'জায়গাটা তালিকায় পাওয়া যায়নি। তালিকা থেকে বাছুন বা ম্যাপে ক্লিক করুন।':'কোথায় থাকেন সেটা বাছুন।');return;}
  const S=state[mode];
  if(S.example){S.people=[];S.example=false;}
  S.people.push({id:Date.now(),name,rel,label:pending.label,lat:pending.lat,lng:pending.lng,tz:pending.tz});
  pending=null;e.target.reset();document.getElementById('pRel').value='বন্ধু';showNow();showErr('pErr');save();render();
});
document.getElementById('clearEx').onclick=()=>{const S=state[mode];S.people=[];S.example=false;save();render();};
document.getElementById('people').addEventListener('click',e=>{const b=e.target.closest('.del');if(!b)return;const S=state[mode];S.people=S.people.filter(p=>String(p.id)!==b.dataset.id);save();render();});

// list
function render(){
  const S=state[mode];
  document.getElementById('exbanner').hidden=!S.example;
  document.getElementById('meNow').innerHTML=S.me?'এখন: <b>'+esc(S.me.label)+'</b>':'এখনও বাছাই করা হয়নি';
  const ul=document.getElementById('people');
  const rows=S.me?S.people.map(p=>({...p,km:hav(S.me.lat,S.me.lng,p.lat,p.lng)})).sort((a,b)=>a.km-b.km):[];
  const sp=S.speeds;
  ul.innerHTML=rows.length?rows.map(p=>{
    const mi=p.km*0.621371,road=p.km*ROAD;let facts='',distHtml;
    if(mode==='bd') distHtml=`<div class="dist">সড়কপথে প্রায় ${bn(road)} কিমি<em>${bn(road*0.621371)} মাইল</em></div><div class="where">সরলরেখায় ${bn(p.km)} কিমি · ${bn(mi)} মাইল</div>`;
    else distHtml=`<div class="dist">${bn(p.km)} কিমি<em>${bn(mi)} মাইল</em></div><div class="where">আকাশপথে সরলরেখায়</div>`;
    if(mode==='bd'){
      facts+=`<span>গাড়ি/বাসে প্রায় ${dur(road/sp.road)}</span><span>হেঁটে প্রায় ${dur(road/sp.walk)}</span>`;
    }else{
      facts+=`<span>বিমানে প্রায় ${dur(p.km/sp.plane)}</span>`;
      const a=tzOffsetMin(S.me.tz),b=tzOffsetMin(p.tz);
      if(a!==null&&b!==null){const df=b-a;const t=localTime(p.tz);
        const rel=df===0?'আপনার সমান সময়':(Math.abs(df)%60===0?bn(Math.abs(df)/60):nf1.format(Math.abs(df)/60))+' ঘণ্টা '+(df>0?'এগিয়ে':'পিছিয়ে');
        facts+=`<span>ওখানে এখন ${t}</span><span>${rel}</span>`;}
    }
    return `<li class="person"><div class="dot" style="background:${relColor(p.rel)}">${esc([...p.name][0]||'')}</div>
      <div style="min-width:0"><div class="who">${esc(p.name)}<small>${esc(p.rel)}</small></div><div class="where">${esc(p.label)}</div>
      ${distHtml}<div class="facts">${facts}</div></div>
      <button class="del" data-id="${p.id}" aria-label="${esc(p.name)} মুছুন">মুছুন</button></li>`;}).join('')
    :`<li class="empty">${S.me?'এখনও কাউকে যোগ করা হয়নি। ওপরের ফর্মে নাম আর জায়গা দিয়ে শুরু করুন।':'প্রথমে আপনি কোথায় থাকেন সেটা বাছুন।'}</li>`;
  const sm=document.getElementById('summary');
  if(rows.length){const fac=mode==='bd'?ROAD:1;const n={...rows[0],km:rows[0].km*fac},f={...rows[rows.length-1],km:rows[rows.length-1].km*fac},tot=rows.reduce((s,r)=>s+r.km,0)*fac;
    sm.innerHTML=`<div><small>সবচেয়ে কাছে</small><b>${esc(n.name)}</b><span>${bn(n.km)} কিমি</span></div>
      <div><small>সবচেয়ে দূরে</small><b>${esc(f.name)}</b><span>${bn(f.km)} কিমি</span></div>
      <div><small>${mode==='bd'?'সড়কপথে মোট':'সবার মোট দূরত্ব'}</small><b>${bn(tot)} কিমি</b><span>${bn(tot*0.621371)} মাইল</span></div>`;sm.hidden=false;}
  else sm.hidden=true;
  // rules
  const rt=document.getElementById('ruleText'),sr=document.getElementById('speedRow');
  if(mode==='bd'){rt.textContent='রাস্তা সাধারণত সরলরেখার চেয়ে লম্বা হয়, তাই রাস্তার দূরত্ব ধরা হয়েছে সরলরেখার ১.৩ গুণ। নিচের গড় গতি দিয়ে সময় হিসাব হয়, চাইলে বদলাতে পারেন।';
    sr.innerHTML=`<div><label for="spRoad">গাড়ি/বাস (কিমি/ঘণ্টা)</label><input id="spRoad" type="number" min="5" max="120" value="${sp.road}"></div><div><label for="spWalk">হাঁটা (কিমি/ঘণ্টা)</label><input id="spWalk" type="number" min="1" max="10" step="0.5" value="${sp.walk}"></div>`;}
  else{rt.textContent='বিমানের সময় শুধু আকাশে ওড়ার সময়, সরাসরি ফ্লাইট ধরে। এয়ারপোর্টে অপেক্ষা আর ট্রানজিটের সময় এতে ধরা নেই।';
    sr.innerHTML=`<div><label for="spPlane">বিমানের গড় গতি (কিমি/ঘণ্টা)</label><input id="spPlane" type="number" min="300" max="1000" value="${sp.plane}"></div>`;}
  sr.querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>{const v=parseFloat(i.value);if(!(v>0))return;
    if(i.id==='spRoad')sp.road=v;if(i.id==='spWalk')sp.walk=v;if(i.id==='spPlane')sp.plane=v;save();render();}));
  hot();drawPoints();
}

function setMode(m){
  mode=m;setPick(null);pending=null;showNow();showErr('meErr');showErr('pErr');
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.mode===m));
  const dl=document.getElementById('placeList');
  dl.innerHTML=places[m].map(p=>`<option value="${esc(p.key)}">${m==='bd'?esc(p.sub):''}</option>`).join('');
  document.getElementById('meLabel').textContent=m==='bd'?'জেলা':'শহর';
  document.getElementById('meInput').placeholder=m==='bd'?'যেমন: নেত্রকোনা':'যেমন: Dhaka';
  document.getElementById('pPlace').placeholder=m==='bd'?'জেলার নাম লিখুন':'শহরের নাম ইংরেজিতে লিখুন';
  try{history.replaceState(null,'',m==='world'?'#world':'#bd')}catch(e){}
  store.set('apon_mode',m);
  setupMap();render();
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
setMode(mode);
setInterval(()=>{if(mode==='world')render()},60000);
