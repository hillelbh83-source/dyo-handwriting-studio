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
