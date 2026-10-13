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
function handwritingMathPaths(c,x,y,width,height,stroke,selectedGlyph,naturalness=0,writingPose=null){
 if(c==='.'||c===':')stroke*=1.5;
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
 const cx=x+width/2,cy=y+height*.8;
 const angle=writingPose?writingPose.angle+(Math.random()-.5)*1.2*naturalness:(Math.random()-.5)*8*naturalness;
 const scale=writingPose?writingPose.scale+(Math.random()-.5)*.04*naturalness:1+(Math.random()-.5)*.24*naturalness;
 const dx=(Math.random()-.5)*height*.025*naturalness;
 const dy=writingPose?writingPose.rise*height:(Math.random()-.5)*height*.14*naturalness;
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
function equationWritingLane(element,visual){
 let lane=visual;
 // The outer row of a fraction owns its whole numerator/denominator, including
 // any nested superscripts. Do not let individual script letters reset the hand.
 for(let node=element;node&&node!==visual;node=node.parentElement){
  if(node.tagName==='SPAN'&&node.parentElement?.classList.contains('vlist')&&!node.querySelector(':scope > .frac-line'))lane=node;
 }
 return lane;
}

const nativeMathCharacterCache=new Map();
function nativeMathCharacter(c,element,fontSize,x,y,width,height){
 const style=getComputedStyle(element),font=style.fontStyle+' '+style.fontWeight+' '+fontSize+'px '+style.fontFamily,key=c+'|'+font;
 let cached=nativeMathCharacterCache.get(key);
 if(!cached){
  const metrics=mathMeasureContext;metrics.font=font;const m=metrics.measureText(c),padding=2,w=Math.max(1,m.actualBoundingBoxLeft+m.actualBoundingBoxRight),h=Math.max(1,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent);
  const canvas=document.createElement('canvas');canvas.width=Math.ceil((w+padding*2)*2);canvas.height=Math.ceil((h+padding*2)*2);
  const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.font=font;ctx.fillStyle='#263d39';ctx.fillText(c,padding+m.actualBoundingBoxLeft,padding+m.actualBoundingBoxAscent);
  cached={url:canvas.toDataURL('image/png'),width:w+padding*2,height:h+padding*2,padding};canvas.width=canvas.height=0;
  nativeMathCharacterCache.set(key,cached);if(nativeMathCharacterCache.size>1000)nativeMathCharacterCache.delete(nativeMathCharacterCache.keys().next().value);
 }
 return `<image href="${cached.url}" x="${x-cached.padding}" y="${y-cached.padding}" width="${cached.width}" height="${cached.height}"/>`;
}
function nativeMathShape(svg,box,pad,clipBox){
 const canvas=document.createElement('canvas'),scale=2;
 canvas.width=Math.max(1,Math.ceil(clipBox.width*scale));canvas.height=Math.max(1,Math.ceil(clipBox.height*scale));
 const ctx=canvas.getContext('2d');ctx.fillStyle='#263d39';
 for(const path of svg.querySelectorAll('path')){
  const matrix=path.getScreenCTM();if(!matrix)continue;
  ctx.setTransform(matrix.a*scale,matrix.b*scale,matrix.c*scale,matrix.d*scale,(matrix.e-clipBox.left)*scale,(matrix.f-clipBox.top)*scale);
  ctx.fill(new Path2D(path.getAttribute('d')||''));
 }
 const url=canvas.toDataURL('image/png');canvas.width=canvas.height=0;
 return `<image href="${url}" x="${clipBox.left-box.left+pad}" y="${clipBox.top-box.top+pad}" width="${clipBox.width}" height="${clipBox.height}"/>`;
}

function drawHandwrittenEquation(layout,size){
 const visual=layout.querySelector('.katex-html');if(!visual)return null;
 const display=Boolean(layout.closest('.document-math-display')),naturalness=(display?1:.55)*Math.max(0,Math.min(10,Number($('jitter').value)||0))/10;
 const stroke=rendering.ink*size/280,walker=document.createTreeWalker(visual,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode())if(walker.currentNode.textContent.trim()&&!walker.currentNode.parentElement.closest('svg'))nodes.push(walker.currentNode);
 const letters=[],lanes=new Map();
 const laneFor=element=>{
  const key=equationWritingLane(element,visual);let lane=lanes.get(key);
  if(!lane){lane={element:key,phase:Math.random()*Math.PI*2,angle:(Math.random()-.5)*5*naturalness,scale:1+(Math.random()-.5)*.08*naturalness,rise:(Math.random()-.5)*.045*naturalness};lanes.set(key,lane)}
  return lane;
 };
 // Reserve space using handwriting proportions before asking the browser for LaTeX positions.
 for(const node of nodes){
  const fragment=document.createDocumentFragment(),lane=laneFor(node.parentElement);
  for(const c of node.textContent){
   if(/\s/.test(c)||c==='\u200b'){fragment.append(document.createTextNode(c));continue}
   const {metrics:m,fontSize}=canvasMathMetrics(node.parentElement,c),g=mathHandwritingGlyph(c);
   const nativeWidth=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
   let width=nativeWidth;
   if(g&&height>stroke&&nativeWidth>stroke&&!['\ue020','′','″'].includes(c)){
    const b=handwritingBounds(g),naturalWidth=(b.right-b.left)/Math.max(1,b.bottom-b.top)*(height-stroke)+stroke;
    width=naturalness?Math.max(nativeWidth*.6,Math.min(nativeWidth*1.8,naturalWidth))*lane.scale*(1+(Math.random()-.5)*.06*naturalness):Math.max(nativeWidth*.8,Math.min(nativeWidth*1.4,naturalWidth));
   }
   const span=document.createElement('span');span.className='math-layout-character';span.textContent=c;span.dir='ltr';
   span.style.width=Math.max(0,m.width+width-nativeWidth)+'px';fragment.append(span);
   if(naturalness&&/^[=+−\-±×÷<>≤≥≠≈]$/.test(c)&&node.parentElement.closest('.mrel,.mbin')){
    span.style.marginInlineStart=fontSize*naturalness*(.012+Math.random()*.045)+'px';
    span.style.marginInlineEnd=fontSize*naturalness*(.012+Math.random()*.045)+'px';
   }
   letters.push({element:span,c,glyph:g,metrics:m,fontSize,width,height,lane});
  }
  node.replaceWith(fragment);
 }
 const box=visual.getBoundingClientRect();let paths='',missing=[];const pad=4+Math.ceil(size*.2*naturalness);
 for(const lane of lanes.values())lane.box=lane.element.getBoundingClientRect();
 for(const {element,c,glyph,metrics:m,fontSize,width,height,lane} of letters){
  const rect=element.getBoundingClientRect(),fontAscent=m.fontBoundingBoxAscent??fontSize*.8,fontDescent=m.fontBoundingBoxDescent??fontSize*.2;
  const baseline=rect.top+(rect.height-fontAscent-fontDescent)/2+fontAscent;
  const x=rect.left-box.left-m.actualBoundingBoxLeft+pad,y=baseline-m.actualBoundingBoxAscent-box.top+pad;
  const progress=(rect.left-lane.box.left)/Math.max(1,size);
  const wave=Math.sin(lane.phase+progress*.4),drift=wave*Math.min(height,size)*.025*naturalness;
  const pose={angle:lane.angle+wave*.45*naturalness,scale:lane.scale,rise:lane.rise};
  const shape=handwritingMathPaths(c,x,y+drift,width,height,stroke*(1+(Math.random()-.5)*.12*naturalness),glyph,naturalness,pose);
  if(shape)paths+=shape;else{missing.push(c);paths+=nativeMathCharacter(c,element,fontSize,x,y,width,height)}
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
   const rootShape=handwritingMathPaths('√',x,y,rootWidth,height,stroke,undefined,naturalness*.35);
   paths+=rootShape||nativeMathShape(svg,box,pad,tailBox||r);
   paths+=handwrittenMathLine(x+rootWidth-stroke,y+stroke/2,width-rootWidth+stroke,stroke,naturalness);
  }else{
   const fence=svg.closest('.mopen,.mclose');const shape=fence?handwritingMathPaths(fence.classList.contains('mopen')?'(':')',x,y,width,height,stroke,undefined,naturalness*.35):null;paths+=shape||nativeMathShape(svg,box,pad,r);
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
  // Fit long formulas as complete equations, including on phones and in PDF.
  const maxWidth=container.classList.contains('document-math-display')?container.clientWidth:out.clientWidth-32;
  const svgWidth=+svg.getAttribute('width'),svgHeight=+svg.getAttribute('height');
  if(maxWidth>0&&svgWidth>maxWidth){svg.setAttribute('width',maxWidth);svg.setAttribute('height',svgHeight*maxWidth/svgWidth)}
  svg.setAttribute('aria-label',layout.dataset.source);
  layout.nextElementSibling.replaceChildren(svg);container.classList.add('math-ready');
  await yieldHandwritingWork();
 }
}
// Emphasis follows the painted handwriting, not the much shorter native text
// line box. Both preview and PDF use these same separate line rectangles.
function documentEmphasisRects(paper){
 const result=[],cache=new WeakMap();
 for(const em of paper.querySelectorAll('em')){
  if(em.parentElement.closest('em'))continue;
  const lines=[...em.getClientRects()].filter(r=>r.width&&r.height).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,center:(r.top+r.bottom)/2}));
  for(const element of em.querySelectorAll('.glyph svg,.handwritten-equation,.fallback')){
   const r=element.getBoundingClientRect();if(!r.width||!r.height||!lines.length)continue;
   const line=lines.reduce((best,current)=>Math.abs(current.center-(r.top+r.bottom)/2)<Math.abs(best.center-(r.top+r.bottom)/2)?current:best);
   let bounds=r;
   if(element.tagName.toLowerCase()==='svg'){
    const shapes=[...element.querySelectorAll('path,circle,ellipse,line,polyline,polygon,rect,image')].map(shape=>({shape,matrix:shape.getScreenCTM()}));
    for(const use of element.querySelectorAll('use')){
     const definition=document.getElementById((use.getAttribute('href')||'').slice(1)),matrix=use.getScreenCTM();
     for(const shape of definition?.querySelectorAll('path,circle,ellipse,line,polyline,polygon,rect')||[])shapes.push({shape,matrix});
    }
    bounds=documentPdfPaintBounds(shapes,cache)||r;
   }
   line.left=Math.min(line.left,bounds.left);line.right=Math.max(line.right,bounds.right);
   line.top=Math.min(line.top,bounds.top);line.bottom=Math.max(line.bottom,bounds.bottom);
  }
  for(const line of lines)result.push({left:line.left-3,right:line.right+3,top:line.top-4,bottom:line.bottom+4});
 }
 return result;
}
function refreshDocumentEmphasis(paper){
 paper.querySelector(':scope > .document-emphasis-layer')?.remove();
 if(!paper.isConnected||!paper.clientWidth)return;
 const rects=documentEmphasisRects(paper);if(!rects.length)return;
 const box=paper.getBoundingClientRect(),layer=document.createElementNS('http://www.w3.org/2000/svg','svg');
 layer.classList.add('document-emphasis-layer');layer.setAttribute('aria-hidden','true');
 layer.setAttribute('width',paper.clientWidth);layer.setAttribute('height',paper.clientHeight);
 for(const r of rects){
  const rect=document.createElementNS(layer.namespaceURI,'rect');
  for(const [key,value] of Object.entries({x:r.left-box.left-paper.clientLeft,y:r.top-box.top-paper.clientTop,width:r.right-r.left,height:r.bottom-r.top,rx:4,fill:'#eaf0e3','fill-opacity':.5}))rect.setAttribute(key,value);
  layer.append(rect);
 }
 paper.append(layer);
 if(!paper._emphasisObserver){
  let width=paper.clientWidth;
  paper._emphasisObserver=new ResizeObserver(()=>{const next=paper.clientWidth;if(next!==width){width=next;if(paper._documentRenderComplete)refreshDocumentEmphasis(paper)}});
  paper._emphasisObserver.observe(paper);
 }
}
async function renderMarkdownDocument(out,source,size,{force=false,isCurrent=()=>true}={}){
 const styleKey=JSON.stringify([size,rendering.ink,rendering.spacing,$('jitter').value,metrics,libraryRevision,dyoDocumentAssetRevision]);
 const sameStyle=out._documentStyleKey===styleKey&&out._documentLibrary===data;
 if(!force&&sameStyle&&out._documentRenderComplete!==false&&out._documentSource===source){refreshDocumentEmphasis(out);out.dataset.mathReady='true';$('docState').textContent='התצוגה מעודכנת';return}
 out._documentRenderComplete=false;
 const template=document.createElement('template');
 const html=out._parsedSource===source?out._parsedHTML:await parseDocumentMarkdown(source);
 if(!isCurrent())return;
 out._parsedSource=source;out._parsedHTML=html;
 template.innerHTML=html;
 for(const image of template.content.querySelectorAll('img[data-document-image]')){const src=dyoDocumentAssets[image.dataset.documentImage];if(src&&/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(src))image.src=src;else{const warning=document.createElement('span');warning.className='document-image-warning';warning.textContent='[תמונה חסרה — יש לטעון מחדש את המסמך המקורי]';image.replaceWith(warning)}}
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
   setTextDirection(block,text);const alignment=block.closest('.word-aligned');if(alignment)block.style.textAlign=alignment.classList.contains('word-align-center')?'center':alignment.classList.contains('word-align-left')?'left':'right';await breathe();if(!isCurrent())return;
  }
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[],writingFlows=new WeakMap();
 while(walker.nextNode()){
  const node=walker.currentNode;if(!node.textContent.trim()||node.parentElement.closest('code,pre,.document-math-inline,.document-math-display'))continue;
  nodes.push(node);
 }
 for(const node of nodes){
  const heading=node.parentElement.closest('h1,h2,h3,h4,h5,h6');const factors={H1:1.65,H2:1.45,H3:1.25,H4:1.15,H5:1.08,H6:1};
  if(root.classList.contains('document-empty'))continue;
  const fragment=document.createDocumentFragment();
  const writingBlock=node.parentElement.closest('p,h1,h2,h3,h4,h5,h6,li,th,td')||root;
  let flow=writingFlows.get(writingBlock);
  if(!flow){flow=createHandwritingFlow(+$('jitter').value||0);writingFlows.set(writingBlock,flow)}
  if(node.previousSibling?.nodeName==='BR')flow.newLine();
  for(const batch of inkBatches(node.textContent,size*(heading?factors[heading.tagName]:1),node.parentElement.closest('strong')?1.2:1,flow)){
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
 await Promise.all([...out.querySelectorAll('img.document-image')].map(image=>image.decode()));
 if(!isCurrent())return;
 out._documentRenderComplete=true;
 refreshDocumentEmphasis(out);
 out.dataset.mathReady='true';$('docState').textContent='התצוגה מעודכנת';
 pruneHandwritingDefinitions(out);
}
