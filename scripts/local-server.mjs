import http from 'node:http';
import {watch} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf'};
const clients=new Set(),changed=new Set();let version=String(Date.now()),timer;
const send=(res,cssOnly=false)=>res.write('data: '+JSON.stringify({version,cssOnly})+'\n\n');
watch(root,{recursive:true},(_event,filename)=>{
 if(!filename||filename.startsWith('downloads/'))return;
 changed.add(filename);clearTimeout(timer);timer=setTimeout(()=>{
  version=String(Date.now());const cssOnly=[...changed].every(name=>name.endsWith('.css'));changed.clear();
  for(const client of clients)send(client,cssOnly);
 },250);
});
const heartbeat=setInterval(()=>{for(const client of clients)client.write(': keepalive\n\n')},15000);heartbeat.unref();
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/__live'){
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive'});res.flushHeaders();clients.add(res);send(res);req.on('close',()=>clients.delete(res));return;
    }
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found')}
}).listen(Number(process.env.PORT)||5173,process.env.HOST||'0.0.0.0',()=>console.log('Dyo: http://localhost:'+(Number(process.env.PORT)||5173)));
