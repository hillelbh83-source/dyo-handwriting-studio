'use strict';
const mathMeasureContext=document.createElement('canvas').getContext('2d');
const handwrittenMathAliases={'−':'-','′':"'",'″':'"','ℝ':'R','ℤ':'Z','ℕ':'N','ℚ':'Q','ℂ':'C','ϵ':'ε','ϕ':'φ','Δ':'∆','∖':'\\','\ue020':'/','⋅':'.'};
function mathHandwritingGlyph(c){const key=data.glyphs[c]?.length?c:handwrittenMathAliases[c];const versions=data.glyphs[key];return versions?.length?correctedGlyph(key,versions[Math.floor(Math.random()*versions.length)]):null}
const handwritingBoundsCache=new WeakMap();
function handwritingBounds(g){
 if(handwritingBoundsCache.has(g))return handwritingBoundsCache.get(g);
 const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
 for(const stroke of g.strokes)for(const [x,y] of stroke.points){bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y)}
 handwritingBoundsCache.set(g,bounds);return bounds;
}
function handwritingMathPaths(c,x,y,width,height,stroke,selectedGlyph,naturalness=0){
 const g=selectedGlyph===undefined?mathHandwritingGlyph(c):selectedGlyph;if(!g)return null;
 const b=handwritingBounds(g);width=Math.max(width,stroke*2);height=Math.max(height,stroke*2);
 let sx=(width-stroke)/Math.max(1,b.right-b.left),sy=(height-stroke)/Math.max(1,b.bottom-b.top);
 // Preserve the drawn proportions of ordinary letters instead of stretching
 // every variant into the same typeset rectangle. Tall fences keep their role.
 if(naturalness&&!['(',')','[',']','{','}','∫','√','\ue020','′','″'].includes(c)){
  const scale=Math.min(sx,sy);x+=(width-stroke-(b.right-b.left)*scale)/2;y+=height-stroke-(b.bottom-b.top)*scale;sx=sy=scale;
 }
 const paths=glyphPaths(g.strokes.map(s=>({...s,w:stroke,points:s.points.map(([px,py])=>[x+(px-b.left)*sx+stroke/2,y+(py-b.top)*sy+stroke/2])})));
 if(!naturalness)return paths;
 const cx=x+width/2,cy=y+height*.8,angle=(Math.random()-.5)*8*naturalness,scale=1+(Math.random()-.5)*.24*naturalness;
 const dx=(Math.random()-.5)*height*.045*naturalness,dy=(Math.random()-.5)*height*.14*naturalness;
 return `<g transform="translate(${cx+dx} ${cy+dy}) rotate(${angle}) scale(${scale}) translate(${-cx} ${-cy})">${paths}</g>`;
}
function handwrittenFractionBar(x,y,width,stroke){
 const versions=data.glyphs[fractionBarCharacter];if(!versions?.length)return null;
 const g=correctedGlyph(fractionBarCharacter,versions[Math.floor(Math.random()*versions.length)]),b=handwritingBounds(g);
 if(!Number.isFinite(b.left)||b.right-b.left<1)return null;
 const sx=width/(b.right-b.left),rise=Math.max(stroke,Math.min(width*.04,stroke*4));
 // Stretch to the fraction's width, retaining the pen's vertical movement
 // without stretching its thickness or intruding into numerator/denominator.
 const sy=Math.min(stroke/rendering.ink,rise/Math.max(1,b.bottom-b.top)),middle=(b.top+b.bottom)/2;
 return glyphPaths(g.strokes.map(s=>({...s,w:stroke,points:s.points.map(([px,py])=>[x+(px-b.left)*sx,y+(py-middle)*sy])})));
}
function handwrittenMathLine(x,y,width,stroke,naturalness,useFractionGlyph=false){
 if(useFractionGlyph){const custom=handwrittenFractionBar(x,y,width,stroke);if(custom)return custom}
 if(!naturalness)return `<path d="M${x} ${y}h${width}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`;
 const tilt=(Math.random()-.5)*Math.min(2,width*.025)*naturalness,bend=(Math.random()-.5)*Math.min(3,width*.035)*naturalness;
 return `<path d="M${x} ${y}Q${x+width*.48} ${y+bend} ${x+width} ${y+tilt}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`;
}
function canvasMathMetrics(element,c){const style=getComputedStyle(element);mathMeasureContext.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily;return {metrics:mathMeasureContext.measureText(c),fontSize:parseFloat(style.fontSize)}}
function drawHandwrittenEquation(layout,size){
 const visual=layout.querySelector('.katex-html');if(!visual)return null;
 const display=Boolean(layout.closest('.document-math-display')),naturalness=display?Math.max(0,Math.min(10,Number($('jitter').value)||0))/10:0;
 const stroke=rendering.ink*size/280,walker=document.createTreeWalker(visual,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode())if(walker.currentNode.textContent.trim()&&!walker.currentNode.parentElement.closest('svg'))nodes.push(walker.currentNode);
 const letters=[];
 // Reserve space using handwriting proportions before asking the browser for LaTeX positions.
 for(const node of nodes){
  const fragment=document.createDocumentFragment();
  for(const c of node.textContent){
   if(/\s/.test(c)||c==='\u200b'){fragment.append(document.createTextNode(c));continue}
   const {metrics:m,fontSize}=canvasMathMetrics(node.parentElement,c),g=mathHandwritingGlyph(c);
   const nativeWidth=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
   let width=nativeWidth;
   if(g&&height>stroke&&nativeWidth>stroke&&!['\ue020','′','″'].includes(c)){
    const b=handwritingBounds(g),naturalWidth=(b.right-b.left)/Math.max(1,b.bottom-b.top)*(height-stroke)+stroke;
    width=naturalness?Math.max(nativeWidth*.6,Math.min(nativeWidth*1.8,naturalWidth))*(1+(Math.random()-.5)*.12*naturalness):Math.max(nativeWidth*.8,Math.min(nativeWidth*1.4,naturalWidth));
   }
   const span=document.createElement('span');span.className='math-layout-character';span.textContent=c;span.dir='ltr';
   span.style.width=Math.max(0,m.width+width-nativeWidth)+'px';fragment.append(span);
   letters.push({element:span,c,glyph:g,metrics:m,fontSize,width,height});
  }
  node.replaceWith(fragment);
 }
 const box=visual.getBoundingClientRect();let paths='',missing=[];const pad=4+Math.ceil(size*.2*naturalness),phase=Math.random()*Math.PI*2;
 for(const {element,c,glyph,metrics:m,fontSize,width,height} of letters){
  const rect=element.getBoundingClientRect(),fontAscent=m.fontBoundingBoxAscent??fontSize*.8,fontDescent=m.fontBoundingBoxDescent??fontSize*.2;
  const baseline=rect.top+(rect.height-fontAscent-fontDescent)/2+fontAscent;
  const x=rect.left-box.left-m.actualBoundingBoxLeft+pad,y=baseline-m.actualBoundingBoxAscent-box.top+pad;
  const drift=Math.sin(phase+(rect.left-box.left)/Math.max(1,size)*.65)*Math.min(height,size)*.045*naturalness;
  const shape=handwritingMathPaths(c,x,y+drift,width,height,stroke*(1+(Math.random()-.5)*.12*naturalness),glyph,naturalness);
  if(shape)paths+=shape;else missing.push(c);
 }
 for(const line of visual.querySelectorAll('.frac-line,.overline-line,.underline-line')){
  const r=line.getBoundingClientRect(),style=getComputedStyle(line),bottom=parseFloat(style.borderBottomWidth)||0;
  const y=(bottom?r.bottom-bottom/2:r.top)-box.top+pad;
  paths+=handwrittenMathLine(r.left-box.left+pad,y,r.width,stroke,naturalness,line.classList.contains('frac-line'));
 }
 for(const svg of visual.querySelectorAll('svg')){
  const r=svg.getBoundingClientRect();let x=r.left-box.left+pad,y=r.top-box.top+pad,width=r.width,height=r.height;
  if(svg.closest('.sqrt')){
   const tail=svg.closest('.hide-tail'),tailBox=tail?.getBoundingClientRect();if(tailBox){x=tailBox.left-box.left+pad;y=tailBox.top-box.top+pad;width=tailBox.width;height=tailBox.height}
   const rootWidth=Math.min(width,parseFloat(getComputedStyle(svg).fontSize)*.9);
   paths+=handwritingMathPaths('√',x,y,rootWidth,height,stroke,undefined,naturalness*.35)||'';
   paths+=handwrittenMathLine(x+rootWidth-stroke,y+stroke/2,width-rootWidth+stroke,stroke,naturalness);
  }else{
   const fence=svg.closest('.mopen,.mclose');if(fence)paths+=handwritingMathPaths(fence.classList.contains('mopen')?'(':')',x,y,width,height,stroke,undefined,naturalness*.35)||'';
  }
 }
 const annotation=layout.querySelector('annotation')?.textContent||'';
 const output=document.createElementNS('http://www.w3.org/2000/svg','svg');output.classList.add('handwritten-equation');output.setAttribute('role','img');output.setAttribute('aria-label',annotation);output.dataset.missing=missing.join('');
 output.setAttribute('width',box.width+pad*2);output.setAttribute('height',box.height+pad*2);output.setAttribute('viewBox','0 0 '+(box.width+pad*2)+' '+(box.height+pad*2));output.innerHTML=paths;
 return output;
}
function multilineMathSource(source){
 if(/\\begin\{/.test(source))return null;
 let depth=0,start=0,parts=[];
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(c==='\\'){i++;continue}
  if('{(['.includes(c))depth++;
  else if('})]'.includes(c))depth--;
  else if(c==='='&&depth===0){parts.push(source.slice(start,i));start=i+1}
 }
 if(!parts.length)return null;
 parts.push(source.slice(start));
 return '\\begin{aligned}'+parts[0]+' &='+parts.slice(1).join(' \\\\ & =')+'\\end{aligned}';
}
async function applyHandwrittenMath(out,size,isCurrent=()=>true){
 const layouts=[...out.querySelectorAll('.handwriting-math-layout')];
 if(!layouts.length)return;
 await document.fonts.ready;
 if(!isCurrent()||!out.isConnected)return;
 for(const layout of layouts){
  if(!isCurrent())return;
  let svg=drawHandwrittenEquation(layout,size);if(!svg)continue;
  const container=layout.closest('.document-math-inline,.document-math-display');
  const available=container.clientWidth;
  if(container.classList.contains('document-math-display')&&available>0&&Number(svg.getAttribute('width'))>available){
   const multiline=multilineMathSource(layout.dataset.source);
   if(multiline){
    try{layout.innerHTML=katex.renderToString(multiline,{displayMode:true,throwOnError:true,trust:false,strict:'ignore',output:'htmlAndMathml'});svg=drawHandwrittenEquation(layout,size)}catch{}
   }
  }
  svg.setAttribute('aria-label',layout.dataset.source);
  layout.nextElementSibling.replaceChildren(svg);container.classList.add('math-ready');
  await yieldHandwritingWork();
 }
}
async function renderMarkdownDocument(out,source,size,{force=false,isCurrent=()=>true}={}){
 const styleKey=JSON.stringify([size,rendering.ink,rendering.spacing,$('jitter').value,metrics,libraryRevision]);
 const sameStyle=out._documentStyleKey===styleKey&&out._documentLibrary===data;
 if(!force&&sameStyle&&out._documentRenderComplete!==false&&out._documentSource===source){out.dataset.mathReady='true';$('docState').textContent='התצוגה מעודכנת';return}
 out._documentRenderComplete=false;
 const template=document.createElement('template');
 const html=out._parsedSource===source?out._parsedHTML:await parseDocumentMarkdown(source);
 if(!isCurrent())return;
 out._parsedSource=source;out._parsedHTML=html;
 template.innerHTML=html;
 // Match duplicate blocks in order: each keeps its own random letter choices.
 const reusable=new Map();
 if(!force&&sameStyle)for(const record of out._documentBlocks||[]){let queue=reusable.get(record.key);if(!queue){queue=[];reusable.set(record.key,queue)}queue.push(record.element)}
 const records=[...template.content.children].map(element=>{const key=element.outerHTML;return {key,element:reusable.get(key)?.shift()||element}});
 const wanted=new Set(records.map(record=>record.element));
 let budgetStart=performance.now();
 async function breathe(){if(performance.now()-budgetStart<8)return;await yieldHandwritingWork();budgetStart=performance.now()}
 out.style.fontSize=size+'px';out.style.setProperty('--document-ink-weight',Math.max(0,(rendering.ink-4)*.025)+'px');
 let cursor=out.firstElementChild;
 for(let blockIndex=0;blockIndex<records.length;blockIndex++){
  if(!isCurrent())return;
  const root=records[blockIndex].element;
  if(!root.classList.contains('document-block-ready')){
  // Work while detached. Avoid cloning a whole list/table for each nested block.
  for(const block of [root,...root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,th,td')]){
   if(!block.matches('p,h1,h2,h3,h4,h5,h6,li,blockquote,th,td'))continue;
   const textWalker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let text='';
   while(textWalker.nextNode())if(!textWalker.currentNode.parentElement.closest('.document-math-inline,.document-math-display'))text+=textWalker.currentNode.textContent;
   setTextDirection(block,text);await breathe();if(!isCurrent())return;
  }
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];
 while(walker.nextNode()){
  const node=walker.currentNode;if(!node.textContent.trim()||node.parentElement.closest('code,pre,.document-math-inline,.document-math-display'))continue;
  nodes.push(node);
 }
 for(const node of nodes){
  const heading=node.parentElement.closest('h1,h2,h3,h4,h5,h6');const factors={H1:1.65,H2:1.45,H3:1.25,H4:1.15,H5:1.08,H6:1};
  if(root.classList.contains('document-empty'))continue;
  const fragment=document.createDocumentFragment();
  for(const batch of inkBatches(node.textContent,size*(heading?factors[heading.tagName]:1),node.parentElement.closest('strong')?1.2:1)){
   fragment.append(batch);await breathe();if(!isCurrent())return;
  }
  node.replaceWith(fragment);
 }
 for(const list of [root,...root.querySelectorAll('ol')].filter(element=>element.tagName==='OL')){
  list.classList.add('handwritten-numbering');
  const items=[...list.children].filter(item=>item.tagName==='LI');
  const step=list.reversed?-1:1;
  let number=list.hasAttribute('start')?list.start:list.reversed?items.length:1;
  for(const item of items){
   if(item.hasAttribute('value'))number=item.value;
   const marker=document.createElement('span');marker.className='handwritten-list-number';marker.setAttribute('aria-hidden','true');
   const digits=document.createElement('span');digits.className='handwritten-list-digits';digits.append(ink(String(number),size*.85));
   marker.append(digits,glyphNode('.',size*.85));item.prepend(marker);number+=step;
   await breathe();if(!isCurrent())return;
  }
 }
 for(const link of root.querySelectorAll('a')){link.rel='noopener noreferrer';link.target='_blank'}
  }
  if(root!==cursor)out.insertBefore(root,cursor);
  else cursor=cursor.nextElementSibling;
  // Replace obsolete blocks as each new block arrives, keeping the old preview
  // visible during preparation without doubling the document's length.
  if(cursor&&!wanted.has(cursor)){const next=cursor.nextElementSibling;cursor.remove();cursor=next}
  if(!root.classList.contains('document-block-ready')){
   await applyHandwrittenMath(root,size,isCurrent);if(!isCurrent())return;
   root.classList.add('document-block-ready');
  }
  $('docState').textContent=records.length>8?'מעדכן את המסמך… '+Math.round((blockIndex+1)/records.length*100)+'%':'מעדכן…';
  await breathe();
 }
 while(cursor){const next=cursor.nextElementSibling;cursor.remove();cursor=next}
 // Only a complete generation can become the source for the next incremental update.
 if(!isCurrent())return;
 out._documentSource=source;out._documentStyleKey=styleKey;out._documentLibrary=data;out._documentBlocks=records;
 out._documentRenderComplete=true;
 out.dataset.mathReady='true';$('docState').textContent='התצוגה מעודכנת';
 pruneHandwritingDefinitions(out);
}
