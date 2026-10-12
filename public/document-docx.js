'use strict';
// DOCX stays on the device. Only bounded ZIP entries and known OOXML content
// become editable Markdown; no Word HTML, scripts, or external media execute.
const dyoWordNS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const dyoMathNS='http://schemas.openxmlformats.org/officeDocument/2006/math';
const dyoRelNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const dyoDocxLimit=25*1024*1024,dyoDocxExpandedLimit=80*1024*1024;
function wordChildren(node,name,ns=dyoWordNS){return [...(node?.children||[])].filter(n=>n.namespaceURI===ns&&(!name||n.localName===name))}
function wordChild(node,name,ns=dyoWordNS){return wordChildren(node,name,ns)[0]}
function wordAttr(node,name='val',ns=dyoWordNS){return node?.getAttributeNS(ns,name)||''}
function wordValue(node,name,ns=dyoWordNS){return wordAttr(wordChild(node,name,ns),'val',ns)}
function wordOn(node){return !!node&&!['0','false','off'].includes(wordAttr(node))}
function wordXML(bytes){const doc=new DOMParser().parseFromString(new TextDecoder().decode(bytes),'application/xml');if(doc.querySelector('parsererror')||doc.doctype)throw Error('מבנה ה־Word אינו תקין');return doc}
function wordEscape(text){return text.replace(/[\uE000\uE001]/g,'').replace(/([\\`*_[\]<>#$|])/g,'\\$1')}
function wordSafeURL(url){return /^(https?:\/\/|mailto:)/i.test(url)&&!/[\s<>"\\]/.test(url)}
async function openWordZip(buffer){
 const bytes=new Uint8Array(buffer),view=new DataView(buffer),entries=new Map();let end=-1,total=0;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){end=i;break}
 if(end<0||view.getUint16(end+4,true)||view.getUint16(end+6,true))throw Error('בחרו קובץ DOCX תקין שאינו מוצפן');
 const count=view.getUint16(end+10,true);let pos=view.getUint32(end+16,true);const dirEnd=pos+view.getUint32(end+12,true);
 if(count>5000||dirEnd>end)throw Error('קובץ ה־Word גדול או מורכב מדי');
 for(let i=0;i<count;i++){
  if(pos+46>dirEnd||view.getUint32(pos,true)!==0x02014b50)throw Error('ארכיון Word פגום');
  const flags=view.getUint16(pos+8,true),method=view.getUint16(pos+10,true),compressed=view.getUint32(pos+20,true),size=view.getUint32(pos+24,true),nameLength=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),comment=view.getUint16(pos+32,true),offset=view.getUint32(pos+42,true);
  const name=new TextDecoder().decode(bytes.subarray(pos+46,pos+46+nameLength));
  total+=size;
  if(flags&1||size>dyoDocxLimit||total>dyoDocxExpandedLimit||offset+30>bytes.length||pos+46+nameLength+extra+comment>dirEnd||entries.has(name))throw Error('קובץ ה־Word גדול מדי, מוצפן או פגום');
  entries.set(name,{method,compressed,size,offset});pos+=46+nameLength+extra+comment;
 }
 const cache=new Map();
 return {entries,async read(name,required=false){
  if(cache.has(name))return cache.get(name);
  const entry=entries.get(name);if(!entry){if(required)throw Error('חסר תוכן במסמך Word');return null}
  const {offset,compressed,size,method}=entry;
  if(view.getUint32(offset,true)!==0x04034b50)throw Error('ארכיון Word פגום');
  const start=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
  if(start+compressed>bytes.length)throw Error('ארכיון Word פגום');
  let result;
  if(method===0)result=bytes.slice(start,start+compressed);
  else if(method===8){
   if(typeof DecompressionStream==='undefined')throw Error('להמרת Word השתמשו בדפדפן מעודכן');
   const reader=new Blob([bytes.subarray(start,start+compressed)]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
   const chunks=[];let length=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>size||length>dyoDocxLimit)throw Error('קובץ ה־Word גדול מדי');chunks.push(value)}}catch(error){await reader.cancel();throw error}
   result=new Uint8Array(length);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length}
  }else throw Error('שיטת הדחיסה בקובץ אינה נתמכת');
  if(result.length!==size)throw Error('קובץ ה־Word פגום');cache.set(name,result);return result;
 }};
}
const wordMathSymbols={'−':'-','∫':'\\int ','∬':'\\iint ','∭':'\\iiint ','∮':'\\oint ','∑':'\\sum ','∏':'\\prod ','∞':'\\infty ','∂':'\\partial ','∆':'\\Delta ','Δ':'\\Delta ','∇':'\\nabla ','±':'\\pm ','∓':'\\mp ','×':'\\times ','÷':'\\div ','⋅':'\\cdot ','·':'\\cdot ','≠':'\\ne ','≈':'\\approx ','≤':'\\le ','≥':'\\ge ','∈':'\\in ','∉':'\\notin ','∪':'\\cup ','∩':'\\cap ','⊂':'\\subset ','⊆':'\\subseteq ','⊃':'\\supset ','⊇':'\\supseteq ','←':'\\leftarrow ','→':'\\to ','↔':'\\leftrightarrow ','⇒':'\\Rightarrow ','⇔':'\\Leftrightarrow ','∀':'\\forall ','∃':'\\exists ','ℝ':'\\mathbb{R}','ℤ':'\\mathbb{Z}','ℕ':'\\mathbb{N}','ℚ':'\\mathbb{Q}','ℂ':'\\mathbb{C}','α':'\\alpha ','β':'\\beta ','γ':'\\gamma ','δ':'\\delta ','ε':'\\epsilon ','ϵ':'\\epsilon ','θ':'\\theta ','λ':'\\lambda ','μ':'\\mu ','π':'\\pi ','σ':'\\sigma ','φ':'\\phi ','ϕ':'\\varphi ','ω':'\\omega ','Γ':'\\Gamma ','Θ':'\\Theta ','Π':'\\Pi ','Σ':'\\Sigma ','Ω':'\\Omega ','∅':'\\emptyset ','∥':'\\parallel ','⊥':'\\perp ','…':'\\ldots ','⋯':'\\cdots ','′':"'",'″':"''",'°':'^{\\circ}','√':'\\surd '};
function wordMathText(text){return [...text].map(c=>wordMathSymbols[c]||({'\\':'\\backslash ','{':'\\{','}':'\\}','%':'\\%','#':'\\#','$':'\\$','&':'\\&','_':'\\_','\u00a0':'\\, '}[c])||c).join('')}
function wordMath(node,warnings,depth=0){
 if(!node||depth>100)return '';
 const m=dyoMathNS,name=node.localName,children=wordChildren(node,null,m),child=n=>wordChild(node,n,m),read=n=>wordMath(child(n),warnings,depth+1),prop=child(name+'Pr'),value=(n,fallback='')=>wordValue(prop,n,m)||fallback;
 const join=()=>children.filter(n=>!n.localName.endsWith('Pr')&&n.localName!=='ctrlPr').map(n=>wordMath(n,warnings,depth+1)).join('');
 const arg=n=>'{'+read(n)+'}';
 switch(name){
  case 't':return wordMathText(node.textContent);
  case 'r':{let result=join();let ancestor=node.parentElement,inFunction=false;while(ancestor){if(ancestor.namespaceURI===m&&ancestor.localName==='fName'){inFunction=true;break}ancestor=ancestor.parentElement}if(inFunction){const plain=node.textContent.trim();if(/^(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|log|ln|exp|lim|min|max|sup|inf|det|gcd|arcsin|arccos|arctan)$/.test(plain))return '\\'+plain+' ';if(/^[A-Za-z]+$/.test(plain))return '\\operatorname{'+plain+'}'}let style=wordValue(child('rPr'),'sty',m),script=wordValue(child('rPr'),'scr',m);if(script==='double-struck')return '\\mathbb{'+result+'}';if(script==='script')return '\\mathcal{'+result+'}';if(script==='fraktur')return '\\mathfrak{'+result+'}';if(style==='b'||style==='bi')return '\\mathbf{'+result+'}';return result}
  case 'f':{const type=value('type');if(type==='noBar')return '\\genfrac{}{}{0pt}{}{'+read('num')+'}{'+read('den')+'}';if(type==='lin')return '{'+read('num')+'}/{'+read('den')+'}';return '\\frac'+arg('num')+arg('den')}
  case 'sSup':return arg('e')+'^'+arg('sup');
  case 'sSub':return arg('e')+'_'+arg('sub');
  case 'sSubSup':return arg('e')+'_'+arg('sub')+'^'+arg('sup');
  case 'sPre':return '{}_'+arg('sub')+'^'+arg('sup')+arg('e');
  case 'rad':return '\\sqrt'+(value('degHide')==='1'||!read('deg')?'':'['+read('deg')+']')+arg('e');
  case 'nary':{const symbol=wordMathSymbols[value('chr','∫')]||wordMathText(value('chr','∫'));return symbol+(value('limLoc')==='undOvr'?'\\limits ':'')+(value('subHide')==='1'||!read('sub')?'':'_'+arg('sub'))+(value('supHide')==='1'||!read('sup')?'':'^'+arg('sup'))+' '+arg('e')}
  case 'd':{const delimiter=c=>({'{':'\\{','}':'\\}','‖':'\\Vert','|':'|','⌊':'\\lfloor','⌋':'\\rfloor','⌈':'\\lceil','⌉':'\\rceil','⟨':'\\langle','⟩':'\\rangle'}[c]||c||'.');const p=n=>{const el=wordChild(prop,n,m);return el?wordAttr(el,'val',m):n==='begChr'?'(':n==='endChr'?')':'|'};return '\\left'+delimiter(p('begChr'))+' '+wordChildren(node,'e',m).map(n=>wordMath(n,warnings,depth+1)).join(' '+delimiter(p('sepChr'))+' ')+' \\right'+delimiter(p('endChr'))+' '}
  case 'func':return read('fName')+' '+arg('e');
  case 'fName':return join();
  case 'limLow':case 'limUpp':{const base=read('e');return (/^(lim|min|max|sup|inf)$/.test(base.trim())?'\\'+base.trim()+' ':arg('e'))+(name==='limLow'?'_':'^')+arg('lim')}
  case 'm':return '\\begin{matrix}'+wordChildren(node,'mr',m).map(row=>wordChildren(row,'e',m).map(n=>wordMath(n,warnings,depth+1)).join(' & ')).join(' \\\\ ')+'\\end{matrix}';
  case 'eqArr':return '\\begin{aligned}'+wordChildren(node,'e',m).map(n=>wordMath(n,warnings,depth+1)).join(' \\\\ ')+'\\end{aligned}';
  case 'acc':{const accents={'̂':'hat','ˆ':'hat','̅':'bar','¯':'bar','⃗':'vec','→':'vec','̃':'tilde','~':'tilde','̇':'dot','̈':'ddot','̆':'breve','̌':'check'};return '\\'+(accents[value('chr','̂')]||'hat')+arg('e')}
  case 'bar':return (value('pos')==='bot'?'\\underline':'\\overline')+arg('e');
  case 'groupChr':{const bottom=value('pos')==='bot',brace=['⏞','⏟','{','}'].includes(value('chr'));return (brace?(bottom?'\\underbrace':'\\overbrace'):(bottom?'\\underset':'\\overset'))+(brace?arg('e'):'{'+wordMathText(value('chr','⏞'))+'}'+arg('e'))}
  case 'box':return arg('e');
  case 'borderBox':return '\\boxed'+arg('e');
  case 'phant':return '\\phantom'+arg('e');
  case 'oMath':case 'oMathPara':case 'e':case 'num':case 'den':case 'sup':case 'sub':case 'deg':case 'lim':case 'mr':return join();
  default:if(name.endsWith('Pr')||name==='ctrlPr')return '';warnings.add('מבנה מתמטי נוסף הומר באופן בסיסי: '+name);return join();
 }
}
async function convertWordDocument(file,onProgress=()=>{}){
 if(file.size>dyoDocxLimit)throw Error('בחרו קובץ Word עד 25 MB');
 onProgress('קורא את קובץ ה־Word…');const zip=await openWordZip(await file.arrayBuffer());
 const documentXML=wordXML(await zip.read('word/document.xml',true)),body=documentXML.getElementsByTagNameNS(dyoWordNS,'body')[0];if(!body)throw Error('לא נמצא גוף המסמך');
 const warnings=new Set(),stats={paragraphs:0,equations:0,images:0,tables:0},relationships=new Map(),styles=new Map(),numbering=new Map(),abstracts=new Map(),counters=new Map(),images=new Map(),notes=new Map();
 async function xml(name){const bytes=await zip.read(name);return bytes?wordXML(bytes):null}
 for(const rel of (await xml('word/_rels/document.xml.rels'))?.documentElement.children||[])relationships.set(rel.getAttribute('Id'),{target:rel.getAttribute('Target'),external:rel.getAttribute('TargetMode')==='External',type:rel.getAttribute('Type')});
 if([...relationships.values()].some(rel=>/\/(header|footer)$/.test(rel.type||'')))warnings.add('כותרות עליונות ותחתונות של Word אינן חלק מגוף המסמך שהומר.');
 if(documentXML.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/diagram','relIds').length)warnings.add('SmartArt אינו תמונה רגילה. יש להמיר אותו לתמונה ב־Word.');
 const styleXML=await xml('word/styles.xml');
 for(const style of styleXML?.getElementsByTagNameNS(dyoWordNS,'style')||[]){const id=wordAttr(style,'styleId');styles.set(id,{name:wordValue(style,'name'),basedOn:wordValue(style,'basedOn'),pPr:wordChild(style,'pPr'),rPr:wordChild(style,'rPr')})}
 const numXML=await xml('word/numbering.xml');
 for(const a of numXML?.getElementsByTagNameNS(dyoWordNS,'abstractNum')||[])abstracts.set(wordAttr(a,'abstractNumId'),new Map(wordChildren(a,'lvl').map(l=>[wordAttr(l,'ilvl'),{format:wordValue(l,'numFmt'),start:+wordValue(l,'start')||1}])));
 for(const n of numXML?.getElementsByTagNameNS(dyoWordNS,'num')||[]){const levels=new Map(abstracts.get(wordValue(n,'abstractNumId'))||[]);for(const override of wordChildren(n,'lvlOverride')){const level=wordAttr(override,'ilvl'),definition=wordChild(override,'lvl');levels.set(level,{...(levels.get(level)||{}),...(definition?{format:wordValue(definition,'numFmt'),start:+wordValue(definition,'start')||1}:{}),...(wordChild(override,'startOverride')?{start:+wordValue(override,'startOverride')}: {})})}numbering.set(wordAttr(n,'numId'),levels)}
 for(const kind of ['footnotes','endnotes']){const doc=await xml('word/'+kind+'.xml');for(const note of doc?.documentElement.children||[])if(+wordAttr(note,'id')>0)notes.set(kind+':'+wordAttr(note,'id'),note)}
 function styleChain(p){const result=[];let id=wordValue(wordChild(p,'pPr'),'pStyle');for(let i=0;id&&i<20;i++){const style=styles.get(id);if(!style)break;result.push(style);id=style.basedOn}return result}
 function imageTarget(target){const parts=('word/'+target).split('/'),stack=[];for(const part of parts){if(part==='..')stack.pop();else if(part&&part!=='.')stack.push(part)}return stack.join('/')}
 async function image(node){
  const blip=node.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','blip')[0],legacy=node.getElementsByTagNameNS('urn:schemas-microsoft-com:vml','imagedata')[0];
  const id=blip?.getAttributeNS(dyoRelNS,'embed')||legacy?.getAttributeNS(dyoRelNS,'id');
  const rel=relationships.get(id);if(!rel||rel.external){warnings.add('תמונה מקושרת או ציור שאינו מוטמע לא נטענו. שמרו אותם כתמונה בתוך Word.');return '\n\n[תמונה לא זמינה — יש להטמיע אותה בקובץ Word]\n\n'}
  const path=imageTarget(rel.target);let dataURL=images.get(path);
  if(!dataURL){
   const bytes=await zip.read(path);if(!bytes){warnings.add('חסר קובץ תמונה בתוך Word');return '\n\n[תמונה חסרה בקובץ המקור]\n\n'}
   const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp'};let type=types[path.split('.').at(-1).toLowerCase()];
   if(!type){warnings.add('תמונה בפורמט שאינו נתמך: '+path.split('.').at(-1)+'. יש לשמור אותה כ־PNG או JPEG ב־Word.');return '\n\n[תמונה בפורמט שאינו נתמך]\n\n'}
   const blob=new Blob([bytes],{type});
   dataURL=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
   // Decode before accepting, so a broken picture cannot silently disappear in PDF.
   const picture=new Image();picture.src=dataURL;await picture.decode();
   if(picture.naturalWidth*picture.naturalHeight>40000000)throw Error('תמונה גדולה מדי בקובץ Word');
   if(type==='image/bmp'){const canvas=document.createElement('canvas');canvas.width=picture.naturalWidth;canvas.height=picture.naturalHeight;canvas.getContext('2d').drawImage(picture,0,0);dataURL=canvas.toDataURL('image/png');canvas.width=canvas.height=0}
   images.set(path,dataURL);
  }
  const description=node.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','docPr')[0];
  const alt=description?.getAttribute('descr')||description?.getAttribute('name')||'תמונה מהמסמך';stats.images++;
  const extent=node.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','extent')[0];
  const width=extent?Math.round(+extent.getAttribute('cx')/9525):0;
  const title=width>0?' "dyo-width:'+Math.min(width,1600)+'"':'';
  return '\n\n!['+wordEscape(alt)+']('+dataURL+title+')\n\n';
 }
 const noteReferences=new Map();let runSequence=0;const formattedRuns=new Map();
 async function inline(node){
  if(node.namespaceURI===dyoMathNS&&['oMath','oMathPara'].includes(node.localName)){
   const formulas=node.localName==='oMathPara'?wordChildren(node,'oMath',dyoMathNS):[node];stats.equations+=formulas.length;
   return formulas.map(n=>{const math=wordMath(n,warnings);try{katex.renderToString(math,{throwOnError:true,trust:false,maxExpand:1000})}catch{warnings.add('נוסחה אחת או יותר דורשות בדיקה בתצוגה לאחר ההמרה.')}return node.localName==='oMathPara'?'\n\n$$\n'+math+'\n$$\n\n':'$'+math+'$'}).join('\n\n');
  }
  if(node.localName==='AlternateContent'){const choice=[...node.children].find(n=>n.localName==='Choice')||node.children[0];return choice?inline(choice):''}
  if(node.namespaceURI!==dyoWordNS)return [...node.children].length?(await Promise.all([...node.children].map(inline))).join(''):'';
  switch(node.localName){
   case 't':return wordEscape(node.textContent);
   case 'tab':return '    ';
   case 'br':case 'cr':return wordAttr(node,'type')==='page'?'\n\n:::dyo-pagebreak\n\n':'  \n';
   case 'lastRenderedPageBreak':return '';
   case 'noBreakHyphen':return '‑';case 'softHyphen':return '';
   case 'drawing':case 'pict':return image(node);
   case 'del':case 'moveFrom':case 'instrText':case 'delText':return '';
   case 'footnoteReference':case 'endnoteReference':{const key=(node.localName==='footnoteReference'?'footnotes':'endnotes')+':'+wordAttr(node,'id');if(!noteReferences.has(key))noteReferences.set(key,noteReferences.size+1);return ' ['+noteReferences.get(key)+'] '}
   case 'r':{const rPr=wordChild(node,'rPr');let text='';for(const child of node.children)if(child!==rPr)text+=await inline(child);if(!text.trim()||text.includes('\n\n'))return text;
    // Formatting markers never wrap math delimiters or images.
    if(!text.includes('$')&&!text.includes('![')){
     const flags=(wordOn(wordChild(rPr,'i'))?'I':'')+(wordOn(wordChild(rPr,'b'))?'B':'')+(wordOn(wordChild(rPr,'strike'))?'S':'');
     const id=++runSequence;formattedRuns.set(id,{text,flags});return '\uE000'+id+'\uE001';
    }
    return text}
   case 'hyperlink':{const rel=relationships.get(wordAttr(node,'id',dyoRelNS));const text=(await Promise.all([...node.children].map(inline))).join('');return rel&&wordSafeURL(rel.target)?'['+text+']('+rel.target+')':text}
   case 'object':warnings.add('אובייקט מוטמע הומר רק אם יש לו תמונת תצוגה בקובץ.');return (await Promise.all([...node.children].map(inline))).join('');
   default:if(node.localName.endsWith('Pr')||['bookmarkStart','bookmarkEnd','commentRangeStart','commentRangeEnd','commentReference','fldChar','sectPr'].includes(node.localName))return '';return (await Promise.all([...node.children].map(inline))).join('');
  }
 }
 async function paragraph(p){
  stats.paragraphs++;let text='';for(const n of p.children)if(n.localName!=='pPr')text+=await inline(n);const pieces=[];let last=0;
  for(const match of text.matchAll(/\uE000(\d+)\uE001/g)){if(match.index>last)pieces.push({text:text.slice(last,match.index),flags:''});pieces.push(formattedRuns.get(+match[1]));last=match.index+match[0].length}
  if(last<text.length)pieces.push({text:text.slice(last),flags:''});
  // Leave leading/trailing whitespace outside emphasis delimiters. Internal
  // whitespace inherits only the formatting shared by its neighboring runs.
  const normalized=[];
  for(const piece of pieces){const parts=piece.text.match(/^(\s*)([\s\S]*?)(\s*)$/);if(parts[1])normalized.push({text:parts[1],flags:'',space:true});if(parts[2])normalized.push({text:parts[2],flags:piece.flags});if(parts[3])normalized.push({text:parts[3],flags:'',space:true})}
  for(let i=0;i<normalized.length;i++)if(normalized[i].space){const before=normalized.slice(0,i).reverse().find(p=>!p.space)?.flags||'',after=normalized.slice(i+1).find(p=>!p.space)?.flags||'';let common=0;while(common<before.length&&before[common]===after[common])common++;normalized[i].flags=before.slice(0,common)}
  let formatted='',open='';const marks={I:'*',B:'__',S:'~~'};
  for(let i=0;i<normalized.length;i++){
   const piece=normalized[i];let shared=0;while(shared<open.length&&shared<piece.flags.length&&open[shared]===piece.flags[shared])shared++;
   formatted += [...open.slice(shared)].reverse().map(f=>marks[f]).join('');
   formatted += [...piece.flags.slice(shared)].map(f=>marks[f]).join('')+piece.text;open=piece.flags;
  }
  text=(formatted+[...open].reverse().map(f=>marks[f]).join('')).trim();if(!text)return '';
  const pPr=wordChild(p,'pPr'),chain=styleChain(p),property=name=>wordChild(pPr,name)||chain.map(s=>wordChild(s.pPr,name)).find(Boolean);
  const name=chain.map(s=>s.name).join(' '),outline=property('outlineLvl');
  let heading=outline&&+wordAttr(outline)<6?+wordAttr(outline)+1: +(name.match(/heading\s*(\d)/i)?.[1]||0);
  if(/(^|\s)title($|\s)/i.test(name))heading=1;if(heading)text='#'.repeat(Math.min(6,heading))+' '+text;
  const num=property('numPr');if(num){const id=wordValue(num,'numId'),level=wordValue(num,'ilvl')||'0',definition=numbering.get(id)?.get(level);if(id&&id!=='0'){
   const key=id+':'+level,n=counters.get(key)??definition?.start??1;counters.set(key,n+1);
   text='    '.repeat(Math.min(6,+level))+(definition?.format==='bullet'?'- ':n+'. ')+text;
  }}
  const align=wordAttr(property('jc'));if(['center','right','left'].includes(align)&&!num){text=':::dyo-align '+align+'\n'+text+'\n:::'}
  if(wordOn(property('pageBreakBefore')))text=':::dyo-pagebreak\n\n'+text;
  return text;
 }
 async function table(tbl){
  stats.tables++;const rows=[],openCells=new Map();
  for(const tr of wordChildren(tbl,'tr')){
   const row=[];let column=0;
   for(const tc of wordChildren(tr,'tc')){
    const pr=wordChild(tc,'tcPr'),colspan=Math.min(30,Math.max(1,+wordValue(pr,'gridSpan')||1)),merge=wordChild(pr,'vMerge');
    if(merge&&wordAttr(merge)!=='restart'&&openCells.has(column)){openCells.get(column).rowspan++;column+=colspan;continue}
    const cell={source:await blocks(tc),colspan,rowspan:1};row.push(cell);if(merge)openCells.set(column,cell);else openCells.delete(column);column+=colspan;
   }rows.push(row);
  }
  return ':::dyo-table\n'+JSON.stringify({rows,rtl:wordOn(wordChild(wordChild(tbl,'tblPr'),'bidiVisual'))})+'\n:::';
 }
 async function blocks(parent){const result=[];for(const child of parent.children){if(child.namespaceURI===dyoWordNS&&child.localName==='p')result.push(await paragraph(child));else if(child.namespaceURI===dyoWordNS&&child.localName==='tbl')result.push(await table(child));else if(['sdt','sdtContent','customXml','ins'].includes(child.localName))result.push(await blocks(child));else if(child.localName==='altChunk')warnings.add('מסמך חיצוני מוטמע אינו נתמך. שמרו את תוכנו כחלק רגיל ממסמך Word.');await new Promise(resolve=>setTimeout(resolve,0))}return result.filter(Boolean).join('\n\n')}
 onProgress('ממיר טקסט, נוסחאות ותמונות…');let source=await blocks(body);
 if(noteReferences.size){source+='\n\n---\n\n## הערות\n\n';for(const [key,number] of noteReferences){const note=notes.get(key);source+=number+'. '+(note?await blocks(note):'הערה חסרה בקובץ המקור')+'\n\n'}}
 if(documentXML.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/chart','chart').length)warnings.add('תרשימי Word אינם תמונות; יש להמיר אותם לתמונה בקובץ המקור.');
 if(!source.trim())throw Error('לא נמצא תוכן נתמך בקובץ ה־Word');
 if(source.length>35*1024*1024)throw Error('המסמך לאחר ההמרה גדול מדי');
 return {source,stats,warnings:[...warnings]};
}
