'use strict';
const $=id=>document.getElementById(id), groups={he:[...'אבגדהוזחטיכךלמםנןסעפףצץקרשת'],en:[...'abcdefghijklmnopqrstuvwxyz'],upper:[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],numbers:[...'0123456789.,:;!?()[]{}"\'/-_—–\\|@#$%&~`'],math:[...'+−*^∫∑∏√∞∂∆∇±×÷=≠≈≤≥<>∈∉∪∩⊂⊆→↔∀∃αβγδεθλμπσφω■']},names=['אלף','בית','גימל','דלת','הא','ואו','זין','חית','טית','יוד','כף','כף סופית','למד','מם','מם סופית','נון','נון סופית','סמך','עין','פא','פא סופית','צדי','צדי סופית','קוף','ריש','שין','תיו'];
groups.math.push(fractionBarCharacter);
groups.custom=[];try{let cs=JSON.parse(localStorage.getItem('dyo-custom-chars-v1'));if(Array.isArray(cs))groups.custom=[...new Set(cs.filter(c=>typeof c==='string'&&[...c].length===1&&!/\s/.test(c)))].filter(c=>!Object.values(groups).flat().includes(c))}catch{}
let libraryRevision=0;
let data={version:1,glyphs:{}},char='א',strokes=[],activeStroke=null,editIndex=null;try{let d=JSON.parse(localStorage.getItem('dyo-v1'));if(d&&d.version===1&&d.glyphs)data=d}catch{}let metrics={};try{metrics=JSON.parse(localStorage.getItem('dyo-metrics-v1'))||{}}catch{}let rendering={ink:9,spacing:42};try{const r=JSON.parse(localStorage.getItem('dyo-render-v1'));if(r&&Number.isFinite(r.ink)&&r.ink>=4&&r.ink<=16&&Number.isFinite(r.spacing)&&r.spacing>=25&&r.spacing<=85)rendering=r}catch{}const ctx=$('pad').getContext('2d');
let documentSize=25;try{const saved=Number(localStorage.getItem('dyo-document-size-v1'));if(saved>=16&&saved<=52)documentSize=saved}catch{}
function documentStyleUI(){$('documentSize').value=documentSize;$('documentSizeValue').textContent=documentSize;$('documentInk').value=rendering.ink;$('documentInkValue').textContent=rendering.ink}
documentStyleUI();
$('chooseDocument').onclick=()=>$('mdFile').click();
$('toggleTextStyle').onclick=()=>{const open=$('textStylePanel').hidden;$('textStylePanel').hidden=!open;$('toggleTextStyle').setAttribute('aria-expanded',String(open))};
$('documentSize').oninput=()=>{documentSize=+$('documentSize').value;try{localStorage.setItem('dyo-document-size-v1',String(documentSize))}catch{}documentStyleUI();renderDoc()};
$('documentInk').oninput=updateRendering;
$('resetTextStyle').onclick=()=>{documentSize=25;try{localStorage.removeItem('dyo-document-size-v1')}catch{}$('documentInk').value=9;updateRendering();documentStyleUI();renderDoc()};
$('wordSpacing').value=rendering.spacing;
function renderingUI(){documentStyleUI();$('wordSpacingValue').textContent=rendering.spacing+'%'}
function updateRendering(){rendering={ink:+$('documentInk').value,spacing:+$('wordSpacing').value};try{localStorage.setItem('dyo-render-v1',JSON.stringify(rendering))}catch{}renderingUI();requestVariants();window.dyoChanged?.('rendering');if($('md').value.trim())renderDoc()}
$('wordSpacing').oninput=updateRendering;renderingUI();
for(let c of Object.keys(data.glyphs)){if(!Object.values(groups).flat().includes(c))groups.custom.push(c)}
$('drawFractionBar').onclick=()=>{$('group').value='math';pick(fractionBarCharacter);$('pad').focus({preventScroll:true})};
$('addCharacter').onclick=()=>{let c=$('customCharacter').value.trim();if([...c].length!==1)return toast('הזן תו אחד, למשל + או _');let found=Object.keys(groups).find(g=>groups[g].includes(c));if(!found){groups.custom.push(c);try{localStorage.setItem('dyo-custom-chars-v1',JSON.stringify(groups.custom))}catch{}found='custom';stats();window.dyoChanged?.('custom')}$('group').value=found;pick(c);$('customCharacter').value=''};

const uniformStrokeCache=new WeakMap();
function uniformImportedStrokes(g){
 if(uniformStrokeCache.has(g))return uniformStrokeCache.get(g);
 const result=g.strokes.map(st=>{
  if(!st.fill)return st;
  const p=st.points;
  // Dyo's TTF writer stores each pen segment as a quad, and round caps as octagons.
  if(p.length===4)return {w:rendering.ink,points:[[ (p[0][0]+p[3][0])/2,(p[0][1]+p[3][1])/2 ],[ (p[1][0]+p[2][0])/2,(p[1][1]+p[2][1])/2 ]]};
  if(p.length===8)return {w:rendering.ink,points:[p.reduce((sum,v)=>[sum[0]+v[0]/8,sum[1]+v[1]/8],[0,0])]};
  return st;
 });
 uniformStrokeCache.set(g,result);return result;
}
function correctedGlyphUncached(c,g){if(!g?.strokes?.length)return g;if(g.imported){const m=metrics[c]||{},k=(m.scale||100)/100;return {...g,width:g.width*k,strokes:uniformImportedStrokes(g).map(st=>({...st,w:rendering.ink,points:st.points.map(([x,y])=>[x*k,440+(y-440)*k+(Number(m.y)||0)])}))}};let ss=g.strokes,pts=ss.flatMap(s=>s.points),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),h=bottom-top,w=right-left,k=1,newBottom=bottom;const auto=g.normalized!==false;
if(auto){if(c==='י'){k=h>1?110/h:1;newBottom=275}
else if(c==='.'||c===','){k=h>1?(c===','?65:1)/h:1;newBottom=c===','?470:440}
else if(c===':'||c===';'){k=h>1?150/h:1;newBottom=c===';'?460:395}
else if(c==='\"'||c==="'"){k=h>1?70/h:1;newBottom=230}
else if(c==='-'||c==='–'||c==='−'||c==='_'||c==='—'||c===fractionBarCharacter){k=w>1?(c==='—'?260:190)/w:1;newBottom=c==='_'?470:310}
else if(c==='+'){k=h>1?210/h:1;newBottom=405}
}
let m=metrics[c]||{},scale=(m.scale||100)/100,shift=Number(m.y)||0;return {...g,width:g.imported?g.width*scale:Math.max(25,(right-left)*k*scale+24),strokes:ss.map(st=>({...st,w:rendering.ink,points:st.points.map(([x,y])=>[(x-left)*k*scale+12,440+(newBottom+(y-bottom)*k-440)*scale+shift])}))}}
function correctedGlyph(c,g){return cachedCorrectedGlyph(c,g)}
function metricUI(){let m=metrics[char]||{};$('metricScale').value=m.scale||100;$('metricY').value=m.y||0;$('metricScaleValue').textContent=(m.scale||100)+'%';$('metricYValue').textContent=m.y||0}
function updateMetrics(){metrics[char]={scale:+$('metricScale').value,y:+$('metricY').value};try{localStorage.setItem('dyo-metrics-v1',JSON.stringify(metrics))}catch{toast('הכוונון לא נשמר. הורד גיבוי.')}metricUI();requestVariants();renderDoc();window.dyoChanged?.('metrics')}
$('metricScale').oninput=updateMetrics;$('metricY').oninput=updateMetrics;$('resetMetrics').onclick=()=>{delete metrics[char];try{localStorage.setItem('dyo-metrics-v1',JSON.stringify(metrics))}catch{}metricUI();requestVariants();renderDoc();window.dyoChanged?.('metrics')};
function toast(t){$('toast').textContent=t;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3000)}
function persist(){libraryRevision++;const snapshot=data;$('saveState').textContent='שומר במכשיר…';dyoSaveLibrary(snapshot).then(()=>{$('saveState').textContent='נשמר במכשיר שלך'}).catch(()=>{$('saveState').textContent='השמירה נכשלה — הורד גיבוי';toast('לא ניתן לשמור בדפדפן. הורד גיבוי כדי לשמור את העבודה.')});stats();window.dyoChanged?.('glyphs')}

function stats(){let total=Object.values(groups).flat().length,n=Object.keys(data.glyphs).filter(c=>data.glyphs[c]?.length).length;$('count').textContent=n;$('progress').style.width=n/total*100+'%';$('remaining').textContent=`מתוך ${total} תווים בספרייה`}
function pick(c){char=c;strokes=[];editIndex=null;draw();renderCharacterLabel($('selected'),c);$('charName').textContent=names[groups.he.indexOf(c)]||latexCharacterNames[c]||(/^[a-z]$/i.test(c)?'אות באנגלית':/[0-9]/.test(c)?'מספר':groups.math.includes(c)?'סימן מתמטי':'סימן פיסוק');renderCharacterLabel($('variantChar'),c);renderChars();variants();metricUI();$('saveGlyph').textContent='שמירת גרסה +';$('drawHelp').textContent=c===fractionBarCharacter?'צייר קו משמאל לימין, עם התנועה הטבעית של היד. האורך יותאם לכל שבר. אפשר לשמור כמה גרסאות.':'מלא את אזור גוף האות. אותיות יורדות יכולות לחצות את קו הבסיס.'}
function renderChars(){$('chars').dir=$('group').value==='he'?'rtl':'ltr';let g=groups[$('group').value];$('groupCount').textContent=g.filter(c=>data.glyphs[c]?.length).length+'/'+g.length;$('chars').replaceChildren();g.forEach(c=>{let b=document.createElement('button');renderCharacterLabel(b,c);b.className=(c===char?'active ':'')+(data.glyphs[c]?.length?'done':'');b.setAttribute('aria-label',(latexCharacterNames[c]||c)+' '+(data.glyphs[c]?.length||0)+' גרסאות');let n=document.createElement('small');n.textContent=data.glyphs[c]?.length||'';b.append(n);b.onclick=()=>pick(c);$('chars').append(b)})}
function draw(){ctx.clearRect(0,0,1000,600);ctx.strokeStyle='#263d39';ctx.fillStyle='#263d39';ctx.lineCap='round';ctx.lineJoin='round';for(const s of strokes){ctx.lineWidth=s.w;ctx.beginPath();s.points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));if(s.fill){ctx.closePath();ctx.fill()}else if(s.points.length===1){ctx.arc(...s.points[0],s.w/2,0,Math.PI*2);ctx.fill()}else ctx.stroke()}}
function pos(e){let r=$('pad').getBoundingClientRect();return [Math.max(0,Math.min(1000,(e.clientX-r.left)*1000/r.width)),Math.max(0,Math.min(600,(e.clientY-r.top)*600/r.height))]}
let drawingPointer=null;
$('pad').onpointerdown=e=>{if(e.button!==0||drawingPointer!==null)return;e.preventDefault();drawingPointer=e.pointerId;$('pad').setPointerCapture(e.pointerId);activeStroke={w:+$('pen').value,points:[pos(e)]};strokes.push(activeStroke);draw()};
$('pad').onpointermove=e=>{if(!activeStroke||e.pointerId!==drawingPointer)return;e.preventDefault();for(const point of e.getCoalescedEvents?.()||[e])activeStroke.points.push(pos(point));draw()};
function stop(){activeStroke=null;drawingPointer=null}
function finishDrawing(e){if(e.pointerId!==drawingPointer)return;if(e.type==='pointerup'&&activeStroke)activeStroke.points.push(pos(e));stop();draw()}
$('pad').onpointerup=finishDrawing;$('pad').onpointercancel=finishDrawing;$('pad').onlostpointercapture=finishDrawing;
window.addEventListener('blur',stop);

$('undo').onclick=()=>{strokes.pop();draw()};$('clear').onclick=()=>{strokes=[];editIndex=null;$('saveGlyph').textContent='שמירת גרסה +';draw()};
function target(c){if(c==='+')return 210;if(c==='^')return 130;if('.,:;\'"'.includes(c))return c===','?80:55;if('ךןףץgjpqy'.includes(c))return 360;if('לABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789∫∑∏√'.includes(c)||'bdfhklt'.includes(c))return 360;if('=±≈≠<>≤≥-'.includes(c))return 130;return 280}
function prepare(c,ss,auto=true){let pts=ss.flatMap(s=>s.points),minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1])),height=Math.max(1,maxY-minY),scale=auto?Math.min(5,c===fractionBarCharacter?260/Math.max(1,maxX-minX):target(c)/height):1;let descend='ךןףץgjpqy'.includes(c)?100:0, bottom='.,'.includes(c)?450:440+descend;if('=±≈≠<>≤≥-'.includes(c))bottom=350;if(c==='"'||c==="'")bottom=220;return {width:Math.max(25,(maxX-minX)*scale+24),strokes:ss.map(s=>({...s,w:s.w*scale,points:s.points.map(([x,y])=>[(x-minX)*scale+12,auto?(y-maxY)*scale+bottom:y])})),raw:structuredClone(ss),normalized:auto}}
function smoothStroke(st){const p=[];for(let v of st.points){let last=p.at(-1);if(!last||Math.hypot(v[0]-last[0],v[1]-last[1])>.7)p.push(v.slice())}if(p.length<3)return p;let out=[p[0]];for(let i=0;i<p.length-1;i++){let a=p[Math.max(0,i-1)],b=p[i],c=p[i+1],d=p[Math.min(p.length-1,i+2)],steps=Math.max(2,Math.min(20,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/5)));for(let k=1;k<=steps;k++){let t=k/steps,t2=t*t,t3=t2*t;out.push([0,1].map(n=>.5*((2*b[n])+(-a[n]+c[n])*t+(2*a[n]-5*b[n]+4*c[n]-d[n])*t2+(-a[n]+3*b[n]-3*c[n]+d[n])*t3)))}}return out}
function penOutline(st,natural){if(st.fill)return '<path d="M'+st.points.map(p=>p.join(',')).join('L')+'Z" fill="currentColor"/>'; let p=smoothStroke(st);if(!p.length)return '';if(p.length===1)return `<circle cx="${p[0][0]}" cy="${p[0][1]}" r="${st.w/2}" fill="currentColor"/>`;let distances=[0];for(let i=1;i<p.length;i++)distances.push(distances[i-1]+Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]));let length=distances.at(-1)||1,phase=natural?Math.random()*6.28:1.5,amount=0,left=[],right=[];for(let i=0;i<p.length;i++){let a=p[Math.max(0,i-1)],b=p[Math.min(p.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,t=distances[i]/length;let pressure=1+amount*(.16*Math.sin(t*9+phase)+.08*Math.cos(t*22+phase)),end=1-amount*.32*Math.exp(-Math.min(distances[i],length-distances[i])/18),r=st.w*.5*pressure*end;left.push([p[i][0]-dy/l*r,p[i][1]+dx/l*r]);right.push([p[i][0]+dy/l*r,p[i][1]-dx/l*r])}let all=left.concat(right.reverse());let path='M'+all.map(v=>v.map(n=>n.toFixed(2)).join(',')).join('L')+'Z';return `<path d="${path}" fill="currentColor"/><circle cx="${p[0][0]}" cy="${p[0][1]}" r="${st.w*.5*(1-amount*.32)}" fill="currentColor"/><circle cx="${p.at(-1)[0]}" cy="${p.at(-1)[1]}" r="${st.w*.5*(1-amount*.32)}" fill="currentColor"/>`}
function glyphPaths(ss){
 const paths=new Map();let filled='';
 for(const st of ss){
  if(st.fill){filled+='M'+st.points.map(p=>p.join(',')).join('L')+'Z';continue}
  const points=st.points.length>2?smoothStroke(st):st.points;if(!points.length)continue;
  let path='M'+points.map(p=>p.map(n=>n.toFixed(2)).join(',')).join('L');if(points.length===1)path+='l0,0';
  paths.set(st.w,(paths.get(st.w)||'')+path);
 }
 return (filled?'<path fill="currentColor" d="'+filled+'"/>':'')+[...paths].map(([width,path])=>'<path d="'+path+'" fill="none" stroke="currentColor" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>').join('');
}
function svgGlyph(g,attrs='',natural=0){return `<svg ${attrs} viewBox="0 0 ${g.width} 600" xmlns="http://www.w3.org/2000/svg">${cachedGlyphSVG(g).paths}</svg>`}
$('saveGlyph').onclick=()=>{stop();if(!strokes.length)return toast('צייר קודם את התו');const g=prepare(char,strokes,$('normalize').checked);data.glyphs[char]??=[];if(editIndex===null)data.glyphs[char].push(g);else data.glyphs[char][editIndex]=g;persist();pick(char);renderDoc();toast('הגרסה נשמרה. אפשר לצייר עוד אחת!')};
let variantPage=0,variantCharacter=null,variantTimer=null;
const variantsPerPage=24;
function requestVariants(){clearTimeout(variantTimer);variantTimer=setTimeout(variants,80)}
function variants(){
 clearTimeout(variantTimer);
 if(variantCharacter!==char){variantPage=0;variantCharacter=char}
 const versions=data.glyphs[char]||[],pages=Math.ceil(versions.length/variantsPerPage);
 variantPage=Math.max(0,Math.min(variantPage,pages-1));
 const fragment=document.createDocumentFragment(),start=variantPage*variantsPerPage;
 versions.slice(start,start+variantsPerPage).forEach((g,offset)=>{
  const i=start+offset,d=document.createElement('div');d.className='variant';d.innerHTML=svgGlyph(correctedGlyph(char,g));d.tabIndex=0;d.setAttribute('role','button');d.setAttribute('aria-label','עריכת גרסה '+(i+1));
  const edit=()=>{strokes=structuredClone(g.raw||g.strokes);editIndex=i;draw();$('saveGlyph').textContent='עדכון גרסה '+(i+1)};
  d.onclick=edit;d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();edit()}};
  const b=document.createElement('button');b.textContent='×';b.setAttribute('aria-label','מחיקת גרסה '+(i+1));
  b.onclick=e=>{e.stopPropagation();data.glyphs[char].splice(i,1);if(!data.glyphs[char].length)delete data.glyphs[char];persist();pick(char);renderDoc()};d.append(b);fragment.append(d);
 });
 $('variants').replaceChildren(fragment);
 const navigation=$('variantPages');navigation.hidden=pages<=1;
 $('variantPrevious').disabled=variantPage===0;$('variantNext').disabled=variantPage>=pages-1;
 $('variantPageStatus').textContent=versions.length?`${start+1}–${Math.min(start+variantsPerPage,versions.length)} מתוך ${versions.length}`:'';
}
$('variantPrevious').onclick=()=>{variantPage--;variants()};$('variantNext').onclick=()=>{variantPage++;variants()};
$('group').onchange=()=>{let chars=groups[$('group').value];if(chars.length)pick(chars[0]);else{toast('הוסף תו בשדה שמתחת לספריית התווים');$('group').value=Object.keys(groups).find(g=>groups[g].includes(char))||'he';renderChars()}};$('nextMissing').onclick=()=>{let g=groups[$('group').value],c=g.find(c=>!data.glyphs[c]?.length);c?pick(c):toast('כל התווים בקבוצה כבר מוכנים! הוסף להם עוד גרסאות.')};
function glyphNode(c,size,wordDrift=0,weight=1,jitter=+$('jitter').value||0,motion=null){
 if(c==='.'||c===':')weight*=1.5;
 const span=document.createElement('span'),versions=data.glyphs[c];
 if(!versions?.length){renderCharacterLabel(span,c);span.className='fallback';span.style.fontSize=size+'px';return span}
 const g=correctedGlyph(c,versions[Math.floor(Math.random()*versions.length)]);
 const digitHeight=motion?.inlineDigits&&/^[0-9]$/.test(c)?handwritingBounds(g).bottom-handwritingBounds(g).top:280;
 const scale=size/Math.max(280,Number.isFinite(digitHeight)?digitHeight:280);
 span.className='glyph';span.append(sharedGlyphNode(g,weight));
 const rise=motion?motion.y+(Math.random()-.5)*jitter*.045:wordDrift+(Math.random()-.5)*jitter*.35;
 const angle=motion?motion.angle+(Math.random()-.5)*jitter*.045:(Math.random()-.5)*jitter*.5;
 handwritingNodeMetrics.set(span,{edges:handwritingEdges(g,weight),scale,advance:g.width*scale});
 span.style.cssText=`width:${g.width*scale}px;height:${600*scale}px;margin-top:${-160*scale}px;margin-bottom:${-160*scale}px;transform-origin:50% 73.333%;transform:translateY(${rise}px) rotate(${angle}deg);opacity:1`;
 return span;
}
function textDirection(text,fallback='rtl'){let letter=text.replace(/\$[^$]*\$/g,'').match(/[\u0590-\u05ffA-Za-z\u0370-\u03ff]/);if(letter)return /[\u0590-\u05ff]/.test(letter[0])?'rtl':'ltr';return /[0-9]/.test(text)?'ltr':fallback}
function setTextDirection(el,text){el.dir=textDirection(text);el.style.textAlign=el.dir==='ltr'?'left':'right'}
const rtlMirroredCharacters={'(':')',')':'(','[':']',']':'[','{':'}','}':'{','<':'>','>':'<'};
function displayInkCharacter(c,direction){return direction==='rtl'?(rtlMirroredCharacters[c]||c):c}
function* inkBatches(text,size,weight=1,flow=null){
 let fragment=document.createDocumentFragment(),run=null,runDir=null,batchCount=0;
 const jitter=+$('jitter').value||0,base=textDirection(text);
 flow??=createHandwritingFlow(jitter);
 function getRun(direction){
  if(!run||runDir!==direction){run=document.createElement('bdi');run.className='ink-run';run.dir=direction;run.style.direction=direction;fragment.append(run);runDir=direction}
  return run;
 }
 for(const part of text.split(/(\s+)/)){
  if(!part)continue;
  if(/^\s+$/.test(part)){
   for(const c of part){
    if(c==='\n'){fragment.append(document.createElement('br'));run=null;runDir=null;flow.newLine();continue}
    const gap=document.createElement('span'),pace=flow.sample().pace;
    const width=size*(rendering.spacing/100)*(1+flow.strength*(.10*pace+.08*(Math.random()-.5)));
    gap.className='word-gap';gap.textContent=' ';gap.style.width=width+'px';getRun(runDir||base).append(gap);flow.advance(width/size);
    if(++batchCount%128===0){yield fragment;fragment=document.createDocumentFragment()}
   }
   continue;
  }
  // A sentence-ending period belongs to the surrounding Hebrew sentence, while
  // the complete number (including decimal separators) remains left-to-right.
  const numericSentenceEnd=base==='rtl'&&/^[+\-−]?\d+(?:[.,]\d+)*(?:[%‰])?[.,!?;:]+$/.test(part);
  const direction=numericSentenceEnd?'rtl':textDirection(part,runDir||base),word=document.createElement('bdi'),wordPace=flow.sample().pace;
  word.className='ink-word';word.dir=direction;word.style.direction=direction;getRun(direction).append(word);
  const wordSize=size*(1+flow.strength*(.024*wordPace+.045*(Math.random()-.5)));
  let previous=null,previousDirection=null;
  for(const chunk of part.match(/[\u0590-\u05ff]+|[+\-−]?\d+(?:[.,]\d+)*(?:[%‰])?|[A-Za-z0-9\u0370-\u03ff]+|[^\u0590-\u05ffA-Za-z0-9\u0370-\u03ff]+/g)||[]){
   const segment=document.createElement('span');segment.className='ink-chunk';segment.dir=textDirection(chunk,direction);segment.style.direction=segment.dir;word.append(segment);
   if(segment.dir!==previousDirection)previous=null;
   for(const c of chunk){
    const sample=flow.sample(),node=glyphNode(displayInkCharacter(c,segment.dir),wordSize,0,weight,jitter,{y:size*.11*sample.rise,angle:sample.angle,inlineDigits:base==='rtl'});
    if(previous&&previous.classList.contains('glyph')&&node.classList.contains('glyph'))previous.style.marginInlineEnd=handwritingPairGap(previous,node,segment.dir,size,flow)+'px';
    if(node.classList.contains('glyph'))node.style.marginInlineEnd=size*.018+'px';
    segment.append(node);
    const advance=handwritingNodeMetrics.get(node)?.advance||wordSize*.55;flow.advance(advance/size);
    previous=node;previousDirection=segment.dir;
    if(++batchCount%128===0){yield fragment;fragment=document.createDocumentFragment()}
   }
  }
 }
 yield fragment;
}
function ink(text,size,weight=1){const fragment=document.createDocumentFragment();for(const batch of inkBatches(text,size,weight))fragment.append(batch);return fragment}
$('jitter').oninput=()=>{renderDoc();window.dyoChanged?.('preview')};
const tabTitles={draw:'מעבדת אותיות',document:'מסמך',font:'פונט'};
function tabFromAddress(){const name=location.hash.slice(1);if(name==='preview')return 'document';return Object.hasOwn(tabTitles,name)?name:'draw'}
function openTab(name,navigate=true){
 if(!Object.hasOwn(tabTitles,name))name='draw';
 if(navigate&&location.hash!=='#'+name){const url=new URL(location.href);url.hash=name;history.pushState(null,'',url)}
 document.querySelectorAll('.tab').forEach(panel=>panel.classList.toggle('active',panel.id===name));
 document.querySelectorAll('#tabs [data-tab]').forEach(button=>{const active=button.dataset.tab===name;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
 document.title=tabTitles[name]+' — דיו';
 if(name==='document')renderDoc();
 else if($('docPaper').dataset.exporting!=='true')cancelDocumentRender();
}
$('tabs').onclick=e=>{const button=e.target.closest('[data-tab]');if(button)openTab(button.dataset.tab)};
window.addEventListener('popstate',()=>openTab(tabFromAddress(),false));
window.addEventListener('hashchange',()=>openTab(tabFromAddress(),false));

function download(blob,name){let a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
$('saveDocumentText').onclick=()=>{if(!$('md').value.trim())return toast('כתבו טקסט לפני השמירה');download(new Blob([portableDocumentSource($('md').value)],{type:'text/markdown;charset=utf-8'}),'dyo-document.md');toast('קובץ הטקסט נשלח להורדה')};
$('backup').onclick=()=>download(new Blob([JSON.stringify({...data,metrics})],{type:'application/json'}),'dyo-handwriting-backup.json');$('import').onclick=()=>$('jsonFile').click();
$('jsonFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20000000)throw Error();let d=JSON.parse(await file.text());if(d.version!==1||!d.glyphs||typeof d.glyphs!=='object')throw Error();for(let [c,gs] of Object.entries(d.glyphs)){if([...c].length!==1||!Array.isArray(gs)||gs.length>1000)throw Error();for(let g of gs){if(!Number.isFinite(g.width)||g.width<=0||g.width>10000||!Array.isArray(g.strokes)||g.strokes.length>500)throw Error();for(let s of g.strokes)if(!Number.isFinite(s.w)||s.w<=0||!Array.isArray(s.points)||s.points.length>100000||s.points.some(p=>p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>10000)))throw Error();delete g.raw}}if(Object.keys(data.glyphs).length&&!confirm('הגיבוי יחליף את ספריית האותיות הנוכחית. להמשיך?'))return;data=d;metrics=d.metrics&&typeof d.metrics==='object'?d.metrics:{};for(let [key,m] of Object.entries(metrics)){if(!m||!Number.isFinite(m.scale)||m.scale<60||m.scale>150||!Number.isFinite(m.y)||Math.abs(m.y)>100)delete metrics[key]}try{localStorage.setItem('dyo-metrics-v1',JSON.stringify(metrics))}catch{}persist();window.dyoChanged?.('metrics');window.dyoChanged?.('custom');pick(char);renderDoc();toast('הגיבוי נטען')}catch{toast('הקובץ אינו גיבוי תקין של דיו')}e.target.value=''};
const latexSymbols={int:'∫',sum:'∑',prod:'∏',sqrt:'√',infty:'∞',partial:'∂',Delta:'∆',nabla:'∇',pm:'±',times:'×',div:'÷',neq:'≠',approx:'≈',leq:'≤',geq:'≥',in:'∈',notin:'∉',cup:'∪',cap:'∩',subset:'⊂',subseteq:'⊆',to:'→',rightarrow:'→',leftrightarrow:'↔',forall:'∀',exists:'∃',alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',theta:'θ',lambda:'λ',mu:'μ',pi:'π',sigma:'σ',phi:'φ',omega:'ω'};
function mathSVG(source,baseSize=30){
const tokens=source.replace(/\\(?:no)?limits\b/g,'').match(/\\[A-Za-z]+|\\.|[\s\S]/g)||[];let at=0,depth=0;
const symbols=latexSymbols,uniformMathStroke=rendering.ink*baseSize/280;const escape=c=>c.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function skip(){while(/^[\s]$/.test(tokens[at]||''))at++}
function argument(){skip();if(tokens[at]==='{'){at++;return sequence('}')}return base()}
function sequence(end){if(++depth>60)throw Error('המשוואה מקוננת מדי');let items=[];while(at<tokens.length){if(end&&tokens[at]===end){at++;break}let start=at,n=base();while(tokens[at]==='^'||tokens[at]==='_'){let op=tokens[at++],v=argument();if(n.type!=='scripts')n={type:'scripts',base:n};n[op==='^'?'up':'down']=v}items.push(n);if(at===start)at++}depth--;return{type:'row',items}}
function base(){let token=tokens[at++];if(!token)return{type:'row',items:[]};if(token==='{')return sequence('}');if(token==='('||token==='['){let close=token==='('?')':']',content=sequence(close);return{type:'fence',left:token,right:close,content}}if(token==='\\left'){let left=tokens[at++]||'(',items=[];while(at<tokens.length&&tokens[at]!=='\\right'){let start=at,n=base();while(tokens[at]==='^'||tokens[at]==='_'){let op=tokens[at++],v=argument();if(n.type!=='scripts')n={type:'scripts',base:n};n[op==='^'?'up':'down']=v}items.push(n);if(at===start)at++}if(tokens[at]==='\\right')at++;return{type:'fence',left,right:tokens[at++]||')',content:{type:'row',items}}}if(token==='\\frac'||token==='\\dfrac'||token==='\\tfrac')return{type:'frac',a:argument(),b:argument()};if(token==='\\sqrt'){let index=null;if(tokens[at]==='['){at++;index=sequence(']')}return{type:'root',content:argument(),index}}if(['\\text','\\mathrm','\\mathbf','\\mathit','\\operatorname'].includes(token))return argument();if(['\\limits','\\nolimits','\\displaystyle','\\quad','\\qquad','\\,','\\;','\\!'].includes(token))return{type:'space',factor:token==='\\qquad'?1:token==='\\quad'?.7:.15};if(token.startsWith('\\')){let cmd=token.slice(1);if(symbols[cmd])return{type:'char',c:symbols[cmd]};return{type:'row',items:[...token].map(c=>({type:'char',c}))}}if(/^\s$/.test(token))return{type:'space',factor:.2};return{type:'char',c:token}}
function box(w,h,d,s,extra={}){return{w,h,d,s,...extra}}function place(b,x,y){return `<g transform="translate(${x.toFixed(3)},${y.toFixed(3)})">${b.s}</g>`}
function glyph(c,size,geometry){const big='∫∑∏'.includes(c),operator='=±×÷≠≈≤≥<>∈∉∪∩⊂⊆→↔∞−-+'.includes(c),low=/[a-zαβγδεθλμπσφω]/.test(c)&&!'bdfhklt'.includes(c);let height=geometry?.height||(big?size*2.05:operator?size*('=≈'.includes(c)?.28:'→↔∞'.includes(c)?.38:'−-'.includes(c)?.025:.62):low?size*.78:size*.96),bottom=geometry?.bottom??(big?size*.65:operator?-size*.25+height/2:'gjpqy'.includes(c)?size*.22:0),top=bottom-height;
let gs=data.glyphs[c],g=gs?.length?correctedGlyph(c,gs[0]):null,stroke=uniformMathStroke;
if(g){let ps=g.strokes.flatMap(st=>st.points),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys),rawH=Math.max(1,Math.max(...ys)-y0),rawW=Math.max(1,Math.max(...xs)-x0),width=geometry?.width||(big?size*(c==='∫'?.56:1.2):rawW/rawH*height);if(c==='.'||c===',')width=size*.16;let sx=width/rawW,sy=height/rawH;let strokes=g.strokes.map(st=>({...st,w:stroke,points:st.points.map(([x,y])=>[(x-x0)*sx+stroke/2,(y-y0)*sy+top])}));return box(width+stroke+size*.05,-top+stroke/2,bottom+stroke/2,glyphPaths(strokes,+$('jitter').value||0),{big,c})}
let width=geometry?.width||(big?size*(c==='∫'?.56:1.2):operator?size*.8:c==='.'||c===','?size*.2:size*.6);
let path=null;if(c==='∫')path=`M${width*.95} ${top+height*.05} C${-width*.1} ${top-height*.05},${width*.9} ${bottom+height*.05},${width*.05} ${bottom-height*.05}`;
if(c==='∑')path=`M${width} ${top}H0L${width*.63} ${top+height*.5}L0 ${bottom}H${width}`;
if(c==='∏')path=`M0 ${top}H${width}M${width*.15} ${top}V${bottom}M${width*.85} ${top}V${bottom}`;
if(c==='(')path=`M${width*.9} ${top}C${-width*.1} ${top+height*.15},${-width*.1} ${bottom-height*.15},${width*.9} ${bottom}`;
if(c===')')path=`M${width*.1} ${top}C${width*1.1} ${top+height*.15},${width*1.1} ${bottom-height*.15},${width*.1} ${bottom}`;
if(c==='['||c===']'){let x=c==='['?width*.1:width*.9,tip=c==='['?width*.9:width*.1;path=`M${tip} ${top}H${x}V${bottom}H${tip}`}
if(c==='√')path=`M0 ${top+height*.67}L${width*.23} ${top+height*.58}L${width*.45} ${bottom}L${width*.92} ${top}H${width}`;
if(path)return box(width+stroke+size*.08,-top+stroke,bottom+stroke,`<path d="${path}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`,{big,c});
let fontSize=big?size*2.5:size;let stretch=height/(fontSize*.9);return box(width+size*.08,-top+stroke/2,Math.max(0,bottom)+stroke/2,`<text direction="ltr" unicode-bidi="bidi-override" x="0" y="0" font-family="serif" font-size="${fontSize}" textLength="${width}" lengthAdjust="spacingAndGlyphs" transform="translate(0,${bottom}) scale(1,${stretch})">${escape(c)}</text>`,{big,c})}
function layout(n,size){if(n.type==='space')return box(size*n.factor,0,0,'');if(n.type==='char')return glyph(n.c,size);if(n.type==='row'){let w=0,h=0,d=0,s='';for(let item of n.items){let b=layout(item,size),gap=item.type==='char'&&'=±×÷≠≈≤≥<>'.includes(item.c)?size*.13:0;s+=place(b,w+gap,0);w+=b.w+gap*2;h=Math.max(h,b.h);d=Math.max(d,b.d)}return box(w,h,d,s)}if(n.type==='scripts'){let b=layout(n.base,size),up=n.up?layout(n.up,size*.62):null,down=n.down?layout(n.down,size*.62):null,s=b.s,w=b.w,h=b.h,d=b.d;if(b.big&&b.c!=='∫'){let total=Math.max(b.w,up?.w||0,down?.w||0);s=place(b,(total-b.w)/2,0);if(up){let y=-b.h-size*.13-up.d;s+=place(up,(total-up.w)/2,y);h=Math.max(h,-y+up.h)}if(down){let y=b.d+size*.13+down.h;s+=place(down,(total-down.w)/2,y);d=Math.max(d,y+down.d)}return box(total+size*.1,h,d,s)}let x=b.w+size*.05,upY=b.big?-b.h+size*.2:-size*.68,downY=b.big?b.d-size*.08:Math.max(size*.25,b.d+size*.08);if(up&&down&&downY-down.h<upY+up.d+size*.15)downY=upY+up.d+size*.15+down.h;if(up){s+=place(up,x,upY);h=Math.max(h,-upY+up.h);w=Math.max(w,x+up.w)}if(down){s+=place(down,x,downY);d=Math.max(d,downY+down.d);w=Math.max(w,x+down.w)}return box(w+size*.08,h,d,s)}if(n.type==='frac'){let a=layout(n.a,size*.84),b=layout(n.b,size*.84),w=Math.max(a.w,b.w)+size*.3,axis=-size*.25,gap=size*.18,ay=axis-gap-a.d,by=axis+gap+b.h,thick=uniformMathStroke;return box(w,-ay+a.h,Math.max(0,by+b.d),place(a,(w-a.w)/2,ay)+`<path d="M0 ${axis}H${w}" stroke="currentColor" stroke-width="${thick}" stroke-linecap="round"/>`+place(b,(w-b.w)/2,by))}if(n.type==='fence'){let b=layout(n.content,size),axis=-size*.25,height=Math.max(size*1.1,2*Math.max(b.h+axis,b.d-axis)+size*.2),geometry={height,bottom:axis+height/2,width:size*.34},left=n.left==='.'?box(0,0,0,''):glyph(n.left,size,geometry),right=n.right==='.'?box(0,0,0,''):glyph(n.right,size,geometry);return box(left.w+b.w+right.w,Math.max(b.h,left.h,right.h),Math.max(b.d,left.d,right.d),left.s+place(b,left.w,0)+place(right,left.w+b.w,0))}if(n.type==='root'){let b=layout(n.content,size),height=Math.max(size,b.h+b.d+size*.14),r=glyph('√',size,{height,bottom:b.d,width:size*.55}),y=-b.h-size*.12,thick=uniformMathStroke,s=r.s+place(b,r.w,0)+`<path d="M${r.w-size*.08} ${y}H${r.w+b.w}" stroke="currentColor" stroke-width="${thick}" stroke-linecap="round"/>`;if(n.index){let a=layout(n.index,size*.5);s+=place(a,0,-height*.5)}return box(r.w+b.w,Math.max(r.h,b.h+size*.15),b.d,s)}return box(0,0,0,'')}
if(tokens.length>6000)return '<span>המשוואה ארוכה מדי לתצוגה.</span>';try{let b=layout(sequence(),baseSize),pad=4;return `<svg xmlns="http://www.w3.org/2000/svg" direction="ltr" style="direction:ltr;unicode-bidi:isolate" width="${b.w+pad*2}" height="${b.h+b.d+pad*2}" viewBox="-${pad} ${-b.h-pad} ${b.w+pad*2} ${b.h+b.d+pad*2}" aria-label="${escape(source)}">${b.s}</svg>`}catch{return `<span dir="ltr">${escape(source)}</span>`}
}
function inline(parent,text,size){setTextDirection(parent,text);let parts=text.split(/(\$[^$]+\$)/g);parts.forEach(t=>{if(t.startsWith('$')&&t.endsWith('$')){let s=document.createElement('bdi');s.dir='ltr';s.className='inline-math';s.innerHTML=mathSVG(t.slice(1,-1),size);parent.append(s)}else parent.append(ink(t.replace(/\*\*|__/g,''),size))})}
let documentRenderTimer=null,documentRenderGeneration=0,documentRenderResolve=null;
function cancelDocumentRender(){
 documentRenderGeneration++;clearTimeout(documentRenderTimer);documentRenderTimer=null;
 $('docPaper').removeAttribute('aria-busy');
 if(documentRenderResolve){documentRenderResolve();documentRenderResolve=null}
}
function renderDoc(options={}){
 if($('docPaper').dataset.exporting==='true'&&!options.immediate)return $('docPaper')._handwritingReadyPromise||Promise.resolve();
 cancelDocumentRender();
 if(!$('document').classList.contains('active')&&!options.immediate)return Promise.resolve();
 const out=$('docPaper'),generation=documentRenderGeneration;
 out.dataset.mathReady='false';out.setAttribute('aria-busy','true');$('docState').textContent='מעדכן…';
 const promise=new Promise(resolve=>{documentRenderResolve=resolve;
  documentRenderTimer=setTimeout(async()=>{
   documentRenderTimer=null;
   try{await renderMarkdownDocument(out,$('md').value,documentSize,{force:options.force,isCurrent:()=>generation===documentRenderGeneration})}
   catch(error){if(generation===documentRenderGeneration){console.error('Document preview failed:',error);$('docState').textContent='העדכון נכשל — נסה לרענן את התצוגה';toast('לא ניתן לעדכן את התצוגה. הטקסט שלך נשמר.')}}
   finally{if(generation===documentRenderGeneration){out.removeAttribute('aria-busy');documentRenderResolve=null}resolve()}
  },options.immediate?0:80);
 });
 out._handwritingReadyPromise=promise;return promise;
}
$('mdFile').onchange=e=>{const file=e.target.files[0];if(file)importDocumentFile(file)};$('renderDoc').onclick=()=>renderDoc({force:true});$('print').onclick=downloadDocumentPDF;let fontFileURL=null;
async function fontBytes(){
 const library={},name=$('fontName').value||'My Dyo Handwriting';let budgetStart=performance.now();
 for(const [c,versions] of Object.entries(data.glyphs)){
  library[c]=[];
  for(const glyph of versions){
   const corrected=correctedGlyph(c,glyph);library[c].push({width:corrected.width,strokes:corrected.strokes,imported:corrected.imported});
   if(performance.now()-budgetStart>8){await yieldHandwritingWork();budgetStart=performance.now()}
  }
 }
 // The TTF writer expands thousands of outlines. Keep that work off the UI thread.
 return new Promise((resolve,reject)=>{
  let worker;try{worker=new Worker('font-worker.js?v=1')}catch(error){reject(error);return}
  worker.onmessage=({data:result})=>{worker.terminate();result.error?reject(Error(result.error)):resolve(result.bytes)};
  worker.onerror=()=>{worker.terminate();reject(Error('Font worker failed'))};worker.postMessage({library,name});
 });
}
$('fontExport').onclick=async()=>{if(!Object.values(data.glyphs).some(g=>g.length))return toast('צייר לפחות תו אחד לפני יצוא');let button=$('fontExport'),fileHandle=null;button.disabled=true;$('exportStatus').textContent='מכין את הפונט…';try{if(typeof window.showSaveFilePicker==='function'){try{fileHandle=await window.showSaveFilePicker({suggestedName:'my-dyo-handwriting.ttf',types:[{description:'TrueType font',accept:{'font/ttf':['.ttf']}}]})}catch(e){if(e.name==='AbortError'){$('exportStatus').textContent='השמירה בוטלה. אפשר לנסות שוב.';return}}}const bytes=await fontBytes(),blob=new Blob([bytes],{type:'font/ttf'});if(fontFileURL)URL.revokeObjectURL(fontFileURL);fontFileURL=URL.createObjectURL(blob);const link=$('fontDownload');link.href=fontFileURL;link.download='my-dyo-handwriting.ttf';link.hidden=false;link.textContent='הורדת הקובץ המוכן · '+Math.ceil(bytes.length/1024)+' KB';$('fontActions').hidden=false;if(fileHandle){const writable=await fileHandle.createWritable();await writable.write(blob);await writable.close();$('exportStatus').textContent='הפונט נשמר בקובץ שבחרת.'}else{$('exportStatus').textContent='הפונט מוכן. לחץ על הקישור שמתחת להורדת הקובץ.';link.click()}}catch(e){$('exportStatus').textContent='לא ניתן היה לשמור את הפונט: '+(e.message||'שגיאה ביצירת הקובץ');console.error(e)}finally{button.disabled=false}};
$('fontDownload').onclick=()=>{$('exportStatus').textContent='אם הקובץ לא ירד, פתח את האתר בחלון נפרד ונסה שוב.'};
$('openStudio').href=window.location?.href||'/';

function demoDocument(){let math=groups.math;return [
'# המחברת שלי — בדיקת כל התווים',
'זהו מסמך לדוגמה בעברית ובאנגלית, עם מספרים ומשוואות.',
'שלום עולם, זה כתב היד שלי. לכל אות יש אופי משלה.',
'Hello world! This is my own handwriting.',
'## אותיות בעברית',groups.he.join(' '),
'## English — lowercase',groups.en.join(' '),
'## English — uppercase',groups.upper.join(' '),
'## מספרים ופיסוק',groups.numbers.join(' '),...(groups.custom.length?['## תווים שהוספתי',groups.custom.join(' ')]:[]),
'## משוואות לדוגמה',
'$$\\int_{2}^{3}(3x)\\,dx = \\frac{15}{2}$$',
'$$\\sum_{n=1}^{5}n = 15 \\qquad \\prod_{k=1}^{3}k = 6$$',
'$$\\left(\\frac{x^2+1}{2}\\right) + \\sqrt{x^2+1}$$',
'$$x_{12}^{3} + y_2 = 10$$',
'## כל הסימנים המתמטיים',
...Array.from({length:Math.ceil(math.length/8)},(_,i)=>'$$'+math.slice(i*8,(i+1)*8).join(' \\quad ')+'$$')
].join('\n\n')}
let documentTimer=null;
function liveDocument(){dyoDocumentRevision++;cancelDocumentRender();clearTimeout(documentTimer);documentTimer=setTimeout(()=>{saveDocumentSource($('md').value).catch(()=>toast('המסמך לא נשמר. הורידו עותק באמצעות שמירת טקסט.'));renderDoc();window.dyoChanged?.('document')},140);$('docState').textContent='מעדכן…'}
$('md').oninput=liveDocument;
$('loadDemo').onclick=()=>{if($('md').value.trim()&&$('md').value!==demoDocument()&&!confirm('להחליף את הטקסט במסמך הדוגמה? האותיות שלך לא ישתנו.'))return;$('md').value=demoDocument();dyoDocumentFileName='';dyoDocumentReport=null;dyoDocumentAssets={};dyoDocumentAssetRevision++;showDocumentImportReport();liveDocument()};
try{let saved=localStorage.getItem('dyo-document-v1');$('md').value=saved===null?demoDocument():saved}catch{$('md').value=demoDocument()}

stats();pick(char);
openTab(tabFromAddress(),false);

restoreDocumentSource();
