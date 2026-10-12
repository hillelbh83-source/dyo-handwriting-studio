'use strict';
// Keep the current rendered glyphs: exporting must not choose new variants.
const documentPdfMargin=10;
async function documentPdfSlices(paper,width,height,pieces){
 const box=paper.getBoundingClientRect(),pageHeight=width*(297-documentPdfMargin*2)/210;
 const spans=[];let budgetStart=performance.now();
 const breathe=async()=>{if(performance.now()-budgetStart>8){await yieldHandwritingWork();budgetStart=performance.now()}};
 // SVG viewport rectangles are not the ink bounds: rotated strokes and tall
 // letters can extend outside them. Use the geometry already captured below.
 for(const piece of pieces){
  if(piece.keepTogether&&piece.bottom-piece.top<pageHeight*.9)spans.push({top:Math.max(0,piece.top-3),bottom:piece.bottom+3});
  await breathe();
 }
 for(const heading of paper.querySelectorAll('h1,h2,h3,h4,h5,h6')){
  const r=heading.getBoundingClientRect(),next=heading.nextElementSibling;
  const firstLine=next?.querySelector('.ink-word,.handwritten-equation,code')||next;
  const bottom=firstLine?Math.max(r.bottom,firstLine.getBoundingClientRect().bottom):r.bottom;
  if(bottom-r.top<pageHeight*.6)spans.push({top:Math.max(0,r.top-box.top-3),bottom:bottom-box.top+3});
 }
 // Ordinary code/text, when present, also needs to stay on complete lines.
 const walker=document.createTreeWalker(paper,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode;
  if(!node.textContent.trim()||node.parentElement.closest('svg,.handwriting-math-layout,.handwritten-list-number'))continue;
  const range=document.createRange();range.selectNodeContents(node);
  for(const r of range.getClientRects())if(r.height>0&&r.height<pageHeight*.9)spans.push({top:Math.max(0,r.top-box.top-2),bottom:r.bottom-box.top+2});
  await breathe();
 }
 const slices=[];let start=0;
 while(start<height){
  let end=Math.min(height,start+pageHeight);
  if(end<height){
   for(let i=0;i<spans.length+1;i++){
    const crossing=spans.filter(s=>s.top<end&&s.bottom>end&&s.top>start+pageHeight*.25);
    if(!crossing.length)break;
    const next=crossing.reduce((top,span)=>Math.min(top,span.top),end);if(next>=end)break;end=next;
   }
  }
  slices.push({start,height:end-start});start=end;
 }
 return slices;
}
const pdfSvgNS='http://www.w3.org/2000/svg';
function pdfSvgElement(name,attributes={}){
 const node=document.createElementNS(pdfSvgNS,name);
 for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
 return node;
}
function pdfColor(value,fallback='#263d39'){
 if(!value||value==='transparent')return fallback;
 if(value.startsWith('#'))return value;
 const channels=value.match(/[\d.]+/g);
 return channels?.length>=3?'#'+channels.slice(0,3).map(v=>Math.round(Number(v)).toString(16).padStart(2,'0')).join(''):fallback;
}
function pdfVisibleColor(value){return value&&value!=='transparent'&&!/rgba\([^)]*,\s*0\s*\)/.test(value)}
function documentPdfPaintBounds(shapes,cache){
 const bounds={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
 for(const {shape,matrix} of shapes){
  if(!matrix)continue;
  let local=cache.get(shape);
  if(!local){
   const b=shape.getBBox(),style=getComputedStyle(shape);
   const radius=style.stroke==='none'?0:(parseFloat(style.strokeWidth)||0)/2;
   local={left:b.x-radius,top:b.y-radius,right:b.x+b.width+radius,bottom:b.y+b.height+radius};cache.set(shape,local);
  }
  for(const [x,y] of [[local.left,local.top],[local.right,local.top],[local.right,local.bottom],[local.left,local.bottom]]){
   const px=matrix.a*x+matrix.c*y+matrix.e,py=matrix.b*x+matrix.d*y+matrix.f;
   bounds.left=Math.min(bounds.left,px);bounds.right=Math.max(bounds.right,px);bounds.top=Math.min(bounds.top,py);bounds.bottom=Math.max(bounds.bottom,py);
  }
 }
 return Number.isFinite(bounds.top)?bounds:null;
}
async function snapshotDocumentVectors(paper){
 const box=paper.getBoundingClientRect(),pieces=[];
 const geometryCache=new WeakMap();
 let budgetStart=performance.now();
 const breathe=async()=>{if(performance.now()-budgetStart>8){await yieldHandwritingWork();budgetStart=performance.now()}};
 const add=(node,r,keepTogether=false)=>pieces.push({node,top:r.top-box.top,bottom:r.bottom-box.top,keepTogether});
 const paperStyle=getComputedStyle(paper),gridSize=parseFloat(paperStyle.getPropertyValue('--notebook-grid-size'));
 if(gridSize>0){
  const color=paperStyle.getPropertyValue('--notebook-grid-color').trim();
  for(let x=0;x<box.width;x+=gridSize)add(pdfSvgElement('rect',{x,y:0,width:1,height:box.height,fill:color}),box);
  const offsetY=parseFloat(paperStyle.getPropertyValue('--notebook-grid-offset-y'))||0;
  for(let y=((offsetY%gridSize)+gridSize)%gridSize;y<box.height;y+=gridSize)add(pdfSvgElement('rect',{x:0,y,width:box.width,height:1,fill:color}),{top:box.top+y,bottom:box.top+y+1});
 }

 // Capture decorations before the strokes, keeping the document's layer order.
 for(const element of paper.querySelectorAll('hr,blockquote,pre,code,em,th,td')){
  await breathe();
  const r=element.getBoundingClientRect(),style=getComputedStyle(element);
  if(pdfVisibleColor(style.backgroundColor))add(pdfSvgElement('rect',{x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height,rx:parseFloat(style.borderRadius)||0,fill:pdfColor(style.backgroundColor)}),r);
  for(const side of ['Top','Right','Bottom','Left']){
   const thickness=parseFloat(style['border'+side+'Width']);if(!thickness)continue;
   const horizontal=side==='Top'||side==='Bottom';
   const x=side==='Right'?r.right-thickness/2:r.left+(horizontal?0:thickness/2);
   const y=side==='Bottom'?r.bottom-thickness/2:r.top+(horizontal?thickness/2:0);
   add(pdfSvgElement('line',{x1:x-box.left,y1:y-box.top,x2:(horizontal?r.right:x)-box.left,y2:(horizontal?y:r.bottom)-box.top,stroke:pdfColor(style['border'+side+'Color']),'stroke-width':thickness}),r);
  }
 }
 for(const svg of paper.querySelectorAll('svg')){
  if(svg.closest('.handwriting-math-layout')||svg.parentElement.closest('svg'))continue;
  const r=svg.getBoundingClientRect();
  if(!r.width||!r.height)continue;
  const group=pdfSvgElement('g');
  const shapes=[...svg.querySelectorAll('path,circle,ellipse,line,polyline,polygon,rect')].map(shape=>({shape,matrix:shape.getScreenCTM(),shared:false}));
  // Expand references from the shared outline library into standalone PDF paths.
  // This uses the selected outline, preserving exactly the preview's variants.
  for(const use of svg.querySelectorAll('use')){
   const definition=document.getElementById((use.getAttribute('href')||'').slice(1)),matrix=use.getScreenCTM();
   for(const shape of definition?.querySelectorAll('path,circle,ellipse,line,polyline,polygon,rect')||[])shapes.push({shape,matrix,shared:true});
  }
  let paintedBounds=documentPdfPaintBounds(shapes,geometryCache)||r;
  for(const {shape,matrix,shared} of shapes){
   if(!matrix)continue;
   const clone=shape.cloneNode(false),style=getComputedStyle(shape);
   clone.removeAttribute('class');clone.removeAttribute('style');clone.removeAttribute('transform');
   for(const property of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule','opacity']){
    let value=style.getPropertyValue(property);
    if(shared&&(property==='fill'||property==='stroke')&&shape.getAttribute(property)==='currentColor')value=getComputedStyle(svg).color;
    if(value)clone.setAttribute(property,value);
   }
   clone.setAttribute('transform','matrix('+[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e-box.left,matrix.f-box.top].join(' ')+')');
   group.append(clone);
  }
  // Keep horizontal formula scrolling/clipping identical to the preview.
  const scroller=svg.closest('.document-math-inline,.document-math-display');
  if(scroller){
   const clipBox=scroller.getBoundingClientRect(),id='pdf-clip-'+pieces.length;
   const defs=pdfSvgElement('defs'),clip=pdfSvgElement('clipPath',{id,clipPathUnits:'userSpaceOnUse'});
   clip.append(pdfSvgElement('rect',{x:clipBox.left-box.left,y:clipBox.top-box.top,width:clipBox.width,height:clipBox.height}));defs.append(clip);
   group.prepend(defs);group.setAttribute('clip-path','url(#'+id+')');
   paintedBounds={top:Math.max(paintedBounds.top,clipBox.top),bottom:Math.min(paintedBounds.bottom,clipBox.bottom)};
  }
  add(group,paintedBounds,true);
  await breathe();
 }
 // Actual text (e.g. code blocks) is captured in small images, never a whole-page screenshot.
 const walker=document.createTreeWalker(paper,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode;
  if(!node.textContent.trim()||node.parentElement.closest('svg,.handwriting-math-layout'))continue;
  const range=document.createRange();range.selectNodeContents(node);
  const r=range.getBoundingClientRect();if(!r.width||!r.height)continue;
  const style=getComputedStyle(node.parentElement),canvas=document.createElement('canvas'),scale=2;
  canvas.width=Math.ceil((r.width+4)*scale);canvas.height=Math.ceil((r.height+4)*scale);
  const context=canvas.getContext('2d');context.scale(scale,scale);
  context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily;context.fillStyle=style.color;
  for(let i=0;i<node.textContent.length;i++){
   if(i%128===0)await breathe();
   if(/\s/.test(node.textContent[i]))continue;
   range.setStart(node,i);range.setEnd(node,i+1);const charBox=range.getBoundingClientRect();
   const metrics=context.measureText(node.textContent[i]),ascent=metrics.fontBoundingBoxAscent??parseFloat(style.fontSize)*.8,descent=metrics.fontBoundingBoxDescent??parseFloat(style.fontSize)*.2;
   const baseline=charBox.top+(charBox.height-ascent-descent)/2+ascent;
   context.fillText(node.textContent[i],charBox.left-r.left+2,baseline-r.top+2);
  }
  const image=pdfSvgElement('image',{x:r.left-box.left-2,y:r.top-box.top-2,width:r.width+4,height:r.height+4});
  image.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',canvas.toDataURL('image/png'));add(image,{top:r.top-2,bottom:r.bottom+2},true);
  canvas.width=canvas.height=0;
  await breathe();
 }
 return pieces;
}
async function paintDocumentPdfPage(width,slice,pieces,background){
 // Render one page at a time with the same SVG engine as the preview. This
 // preserves CSS-transformed stroke widths, caps and handwritten math curves;
 // the PDF library receives the finished pixels instead of reinterpreting ink.
 const svg=pdfSvgElement('svg',{xmlns:pdfSvgNS,width,height:slice.height,viewBox:`0 ${slice.start} ${width} ${slice.height}`});
 svg.append(pdfSvgElement('rect',{x:0,y:slice.start,width,height:slice.height,fill:background}));
 let budgetStart=performance.now();
 for(const piece of pieces){
  if(piece.bottom>slice.start&&piece.top<slice.start+slice.height)svg.append(piece.node.cloneNode(true));
  if(performance.now()-budgetStart>8){await yieldHandwritingWork();budgetStart=performance.now()}
 }
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}));
 const canvas=document.createElement('canvas'),image=new Image();
 // About 300 dpi on A4, bounded to one page's canvas even for long documents.
 const scale=Math.min(3,4096/Math.max(width,slice.height));
 canvas.width=Math.max(1,Math.ceil(width*scale));canvas.height=Math.max(1,Math.ceil(slice.height*scale));
 try{
  image.src=url;await image.decode();
  const context=canvas.getContext('2d');if(!context)throw Error('Canvas unavailable');
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Page rendering failed')),'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
 }finally{URL.revokeObjectURL(url);image.src='';canvas.width=canvas.height=0}
}
async function downloadDocumentPDF(){
 const button=$('print'),paper=$('docPaper');
 if(button.disabled)return;
 if(!$('md').value.trim())return toast('הוסף טקסט למסמך קודם');
 button.disabled=true;button.textContent='מכין PDF…';
 const controls=[...document.querySelectorAll('#document button,#document input,#document textarea')].filter(control=>control!==button);
 const disabled=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);
 paper.classList.add('pdf-export');paper.dataset.exporting='true';
 try{
  clearTimeout(documentTimer);
  try{localStorage.setItem('dyo-document-v1',$('md').value)}catch{}
  await renderDoc({immediate:true});
  await document.fonts.ready;
  const box=paper.getBoundingClientRect(),width=box.width;
  if(!width||!box.height)throw Error('Document is hidden');
  const pieces=await snapshotDocumentVectors(paper);
  const height=Math.ceil(pieces.reduce((bottom,piece)=>Math.max(bottom,piece.bottom+(piece.keepTogether?3:0)),box.height));
  const slices=await documentPdfSlices(paper,width,height,pieces);
  const pdf=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const background=pdfColor(getComputedStyle(paper).backgroundColor,'#fffefb');
  for(let i=0;i<slices.length;i++){
   button.textContent='מכין PDF — '+(i+1)+' / '+slices.length;
   await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
   if(i)pdf.addPage();
   pdf.setFillColor(background);pdf.rect(0,0,210,297,'F');
   const slice=slices[i],pixels=await paintDocumentPdfPage(width,slice,pieces,background);
   pdf.addImage(pixels,'PNG',0,documentPdfMargin,210,slice.height*210/width,undefined,'FAST');
   await yieldHandwritingWork();
  }
  pdf.setProperties({title:'המסמך שלי — דיו',creator:'Dyo Handwriting Studio'});
  download(pdf.output('blob'),'dyo-document.pdf');toast('קובץ ה־PDF מוכן');
 }catch(error){console.error('PDF export failed:',error);toast('לא ניתן ליצור PDF כרגע. נסה שוב.')}
 finally{paper.classList.remove('pdf-export');delete paper.dataset.exporting;controls.forEach((control,index)=>control.disabled=disabled[index]);button.disabled=false;button.textContent='הורדת PDF'}
}
