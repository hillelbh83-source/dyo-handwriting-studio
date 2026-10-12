'use strict';
importScripts('vendor/katex/katex.min.js','vendor/markdown-it/markdown-it.umd.min.js','document-markdown-parser.js?v=1');
self.onmessage=({data:{id,source}})=>{
 try{self.postMessage({id,html:documentMarkdown.render(source.replace(/\r\n?/g,'\n'))})}
 catch(error){self.postMessage({id,error:error.message||'Markdown parsing failed'})}
};
