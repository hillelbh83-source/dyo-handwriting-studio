'use strict';

// Geometry is shared; choosing a variant and its position is still per occurrence.
const correctedGlyphCache=new WeakMap(),glyphSVGCache=new WeakMap();
const handwritingSVGNamespace='http://www.w3.org/2000/svg';
let handwritingDefinitionRoot=null,handwritingDefinitionSequence=0;
const handwritingDefinitions=new Map();
const handwritingNodeMetrics=new WeakMap(),handwritingEdgeCache=new WeakMap();
function createHandwritingFlow(jitter){
 const strength=Math.max(0,Math.min(10,jitter))/10;
 let phase=Math.random()*Math.PI*2,slowPhase=Math.random()*Math.PI*2;
 return {
  position:0,strength,
  sample(){
   const x=this.position;
   return {rise:strength*(.72*Math.sin(x/7+phase)+.28*Math.sin(x/19+slowPhase)),angle:strength*(1.9*Math.sin(x/13+slowPhase)+.5*Math.sin(x/5+phase)),pace:Math.sin(x/15+slowPhase)};
  },
  advance(distance){this.position+=Math.max(0,distance)},
  newLine(){this.position=0;phase+=.6+Math.random()*.6;slowPhase+=.4+Math.random()*.6}
 };
}
function handwritingEdges(g,weight){
 let entries=handwritingEdgeCache.get(g);if(!entries){entries=new Map();handwritingEdgeCache.set(g,entries)}
 if(entries.has(weight))return entries.get(weight);
 const left=Array(12).fill(Infinity),right=Array(12).fill(-Infinity);
 const include=(x,y,radius)=>{
  const first=Math.max(0,Math.floor((y-radius)/50)),last=Math.min(11,Math.floor((y+radius)/50));
  for(let band=first;band<=last;band++){left[band]=Math.min(left[band],x-radius);right[band]=Math.max(right[band],x+radius)}
 };
 for(const stroke of g.strokes){
  const radius=stroke.fill?0:stroke.w*weight/2,points=stroke.points;
  for(let i=0;i<points.length;i++){
   const [x,y]=points[i];include(x,y,radius);
   const previous=points[i-1]||(stroke.fill?points.at(-1):null);if(!previous)continue;
   const [px,py]=previous;if(Math.abs(y-py)<.001)continue;
   const first=Math.max(0,Math.floor(Math.min(y,py)/50)),last=Math.min(11,Math.floor(Math.max(y,py)/50));
   for(let band=first;band<=last;band++){
    const sampleY=Math.max(Math.min(y,py),Math.min(Math.max(y,py),band*50+25));
    include(px+(x-px)*(sampleY-py)/(y-py),sampleY,radius);
   }
  }
 }
 const result={left,right};entries.set(weight,result);return result;
}
function handwritingPairGap(previous,next,direction,size,flow){
 const a=handwritingNodeMetrics.get(previous),b=handwritingNodeMetrics.get(next);if(!a||!b)return size*.018;
 let clearance=Infinity;
 for(let band=0;band<12;band++){
  if(!Number.isFinite(a.edges.left[band])||!Number.isFinite(b.edges.left[band]))continue;
  const gap=direction==='rtl'?b.advance-b.edges.right[band]*b.scale+a.edges.left[band]*a.scale:a.advance-a.edges.right[band]*a.scale+b.edges.left[band]*b.scale;
  clearance=Math.min(clearance,gap);
 }
 if(!Number.isFinite(clearance))return size*.018;
 const target=size*(.065+flow.strength*.009*flow.sample().pace);
 // A small, bounded adjustment lets contours nest without collapsing words.
 return Math.max(-size*.028,Math.min(size*.14,target-clearance));
}
function yieldHandwritingWork(){return new Promise(resolve=>setTimeout(resolve,0))}
let handwritingMarkdownWorker=null,handwritingParseSequence=0;
const handwritingPendingParses=new Map();
async function parseDocumentMarkdown(source){
 if(!source.trim())return '<p class="document-empty">המסמך שלך יופיע כאן.</p>';
 try{
  if(!handwritingMarkdownWorker){
   handwritingMarkdownWorker=new Worker('document-markdown-worker.js?v=2');
   handwritingMarkdownWorker.onmessage=({data:result})=>{
    const pending=handwritingPendingParses.get(result.id);if(!pending)return;
    handwritingPendingParses.delete(result.id);result.error?pending.reject(Error(result.error)):pending.resolve(result.html);
   };
   handwritingMarkdownWorker.onerror=()=>{for(const pending of handwritingPendingParses.values())pending.reject(Error('Markdown worker unavailable'));handwritingPendingParses.clear();handwritingMarkdownWorker.terminate();handwritingMarkdownWorker=null};
  }
  return await new Promise((resolve,reject)=>{const id=++handwritingParseSequence;handwritingPendingParses.set(id,{resolve,reject});handwritingMarkdownWorker.postMessage({id,source})});
 }catch{
  await yieldHandwritingWork();return documentMarkdown.render(source.replace(/\r\n?/g,'\n'));
 }
}
function cachedCorrectedGlyph(c,g){
 if(!g?.strokes?.length)return g;
 const m=metrics[c]||{},key=[c,rendering.ink,m.scale||100,Number(m.y)||0].join('|');
 let entry=correctedGlyphCache.get(g);
 if(!entry||entry.key!==key){entry={key,glyph:correctedGlyphUncached(c,g)};correctedGlyphCache.set(g,entry)}
 return entry.glyph;
}
function cachedGlyphSVG(g,weight=1){
 let entries=glyphSVGCache.get(g);if(!entries){entries=new Map();glyphSVGCache.set(g,entries)}
 let entry=entries.get(weight);
 if(!entry){
  const strokes=weight===1?g.strokes:g.strokes.map(st=>({...st,w:st.w*weight}));
  entry={paths:glyphPaths(strokes),id:'dyo-glyph-'+(++handwritingDefinitionSequence),node:null};entries.set(weight,entry);
 }
 return entry;
}
function sharedGlyphDefinition(g,weight=1){
 const entry=cachedGlyphSVG(g,weight);
 if(!handwritingDefinitionRoot){
  const root=document.createElementNS(handwritingSVGNamespace,'svg');
  root.classList.add('handwriting-definitions');root.setAttribute('aria-hidden','true');root.setAttribute('width','0');root.setAttribute('height','0');
  handwritingDefinitionRoot=document.createElementNS(handwritingSVGNamespace,'defs');root.append(handwritingDefinitionRoot);document.body.append(root);
 }
 if(!entry.node){entry.node=document.createElementNS(handwritingSVGNamespace,'g');entry.node.id=entry.id;entry.node.innerHTML=entry.paths}
 if(!entry.node.isConnected){handwritingDefinitionRoot.append(entry.node);handwritingDefinitions.set(entry.id,entry.node)}
 return entry.id;
}
function sharedGlyphNode(g,weight=1){
 const id=sharedGlyphDefinition(g,weight),svg=document.createElementNS(handwritingSVGNamespace,'svg'),use=document.createElementNS(handwritingSVGNamespace,'use');
 svg.setAttribute('viewBox',`0 0 ${g.width} 600`);use.setAttribute('href','#'+id);svg.append(use);return svg;
}
function pruneHandwritingDefinitions(paper){
 const used=new Set([...paper.querySelectorAll('use')].map(node=>node.getAttribute('href').slice(1)));
 for(const [id,node] of handwritingDefinitions)if(!used.has(id)){node.remove();handwritingDefinitions.delete(id)}
}
