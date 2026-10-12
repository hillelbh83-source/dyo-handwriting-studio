'use strict';
importScripts('font.js?v=6');
self.onmessage=({data:{library,name}})=>{
 try{const bytes=makeFont(library,name);self.postMessage({bytes},[bytes.buffer])}
 catch(error){self.postMessage({error:error.message||'Font export failed'})}
};
