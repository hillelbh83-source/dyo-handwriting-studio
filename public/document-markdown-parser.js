'use strict';
const documentMarkdown=markdownit({html:false,breaks:true,linkify:false,typographer:false});
function renderDocumentMath(source,display){
 try{return '<span class="handwriting-math-layout" data-source="'+documentMarkdown.utils.escapeHtml(source.trim())+'">'+katex.renderToString(source.trim(),{displayMode:display,throwOnError:true,trust:false,strict:'ignore',output:'htmlAndMathml',maxExpand:1000})+'</span><span class="handwriting-math-result"></span>'}
 catch{return '<code class="math-error" dir="ltr">'+documentMarkdown.utils.escapeHtml(source)+'</code>'}
}
documentMarkdown.inline.ruler.before('escape','document_math',(state,silent)=>{
 const start=state.pos,source=state.src;
 let opener,closer,display=false;
 if(source.startsWith('\\(',start)){opener='\\(';closer='\\)'}
 else if(source[start]==='$'){opener=source[start+1]==='$'?'$$':'$';closer=opener;display=opener==='$$'}
 else return false;
 let end=start+opener.length;
 while((end=source.indexOf(closer,end))!==-1){let slashes=0;for(let i=end-1;i>=0&&source[i]==='\\';i--)slashes++;if(slashes%2===0)break;end+=closer.length}
 if(end===-1||end===start+opener.length)return false;
 if(!silent){const token=state.push(display?'document_math_display':'document_math_inline','',0);token.content=source.slice(start+opener.length,end)}
 state.pos=end+closer.length;return true;
});
documentMarkdown.block.ruler.before('fence','document_math_block',(state,startLine,endLine,silent)=>{
 const first=state.src.slice(state.bMarks[startLine]+state.tShift[startLine],state.eMarks[startLine]);
 const opener=first.startsWith('$$')?'$$':first.startsWith('\\[')?'\\[':null;if(!opener)return false;
 const closer=opener==='$$'?'$$':'\\]';let content=first.slice(opener.length),last=startLine;
 while(true){
  const close=content.indexOf(closer);
  if(close!==-1){if(content.slice(close+closer.length).trim())return false;content=content.slice(0,close);break}
  last++;if(last>=endLine)return false;
  content+='\n'+state.src.slice(state.bMarks[last]+state.tShift[last],state.eMarks[last]);
 }
 if(silent)return true;
 const token=state.push('document_math_block','div',0);token.block=true;token.content=content;token.map=[startLine,last+1];state.line=last+1;return true;
},{alt:['paragraph','reference','blockquote','list']});
documentMarkdown.renderer.rules.document_math_inline=(tokens,i)=>'<bdi class="document-math-inline" dir="ltr">'+renderDocumentMath(tokens[i].content,false)+'</bdi>';
documentMarkdown.renderer.rules.document_math_display=(tokens,i)=>'<span class="document-math-display" dir="ltr">'+renderDocumentMath(tokens[i].content,true)+'</span>';
documentMarkdown.renderer.rules.document_math_block=(tokens,i)=>'<div class="document-math-display" dir="ltr">'+renderDocumentMath(tokens[i].content,true)+'</div>\n';

const markdownDefaultLinkValidation=documentMarkdown.validateLink;
documentMarkdown.validateLink=url=>/^dyo-image:[a-z0-9-]+$/i.test(url)||markdownDefaultLinkValidation(url);

// Word structure that standard Markdown cannot express, without accepting HTML.
let documentDirectiveDepth=0;
documentMarkdown.block.ruler.before('fence','word_structure',(state,startLine,endLine,silent)=>{
 const line=state.src.slice(state.bMarks[startLine]+state.tShift[startLine],state.eMarks[startLine]);
 if(line.trim()===':::dyo-pagebreak'){
  if(silent)return true;state.push('word_pagebreak','div',0);state.line=startLine+1;return true;
 }
 const match=line.match(/^:::dyo-(table|align)(?: (left|right|center))?\s*$/);if(!match)return false;
 let last=startLine+1;while(last<endLine&&state.src.slice(state.bMarks[last],state.eMarks[last]).trim()!==':::')last++;
 if(last===endLine)return false;if(silent)return true;
 const token=state.push('word_'+match[1],'div',0);token.content=state.src.slice(state.bMarks[startLine+1],state.bMarks[last]);token.info=match[2]||'';state.line=last+1;return true;
},{alt:['paragraph','reference','blockquote','list']});
documentMarkdown.renderer.rules.word_pagebreak=()=>'<div class="document-page-break" aria-label="מעבר עמוד"></div>\n';
documentMarkdown.renderer.rules.word_align=(tokens,i)=>{
 if(documentDirectiveDepth>12)return '<p>קטע מורכב מדי לתצוגה</p>';
 documentDirectiveDepth++;try{return '<div class="word-aligned word-align-'+tokens[i].info+'">'+documentMarkdown.render(tokens[i].content)+'</div>'}finally{documentDirectiveDepth--}
};
documentMarkdown.renderer.rules.word_table=(tokens,i)=>{
 if(documentDirectiveDepth>12)return '<p>טבלה מורכבת מדי לתצוגה</p>';
 documentDirectiveDepth++;
 try{
  const table=JSON.parse(tokens[i].content);if(!Array.isArray(table.rows)||table.rows.length>1000)throw Error();
  const rows=table.rows.map(row=>{if(!Array.isArray(row)||row.length>100)throw Error();return '<tr>'+row.map(cell=>{
   if(typeof cell.source!=='string')throw Error();
   const span=n=>Math.min(1000,Math.max(1,Math.trunc(Number(n)||1)));
   return '<td colspan="'+span(cell.colspan)+'" rowspan="'+span(cell.rowspan)+'">'+documentMarkdown.render(cell.source)+'</td>';
  }).join('')+'</tr>'}).join('');
  return '<div class="word-table-wrap"><table class="word-table"'+' dir="'+(table.rtl?'rtl':'ltr')+'"'+'><tbody>'+rows+'</tbody></table></div>\n';
 }catch{return '<p class="math-error">לא ניתן להציג את הטבלה. בדקו את תוכן הטבלה בעורך.</p>'}finally{documentDirectiveDepth--}
};
documentMarkdown.renderer.rules.image=(tokens,i)=>{
 const token=tokens[i],src=token.attrGet('src')||'',alt=documentMarkdown.utils.escapeHtml(token.content||'תמונה');
 const asset=src.match(/^dyo-image:([a-z0-9-]+)$/i);
 if(!asset&&!/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(src))return '<span class="document-image-warning">[תמונה לא מוטמעת: '+alt+']</span>';
 const title=token.attrGet('title')||'',width=Number(title.match(/^dyo-width:(\d+)$/)?.[1]);
 return '<img class="document-image" '+(asset?'data-document-image="'+asset[1]+'"':'src="'+src+'"')+' alt="'+alt+'"'+(width?' style="width:'+Math.min(1600,width)+'px"':'')+' decoding="async">';
};
