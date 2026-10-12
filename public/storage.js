'use strict';
const dyoDB=new Promise((resolve,reject)=>{
 const request=indexedDB.open('dyo-local',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('library');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
let dyoStorageWorker=null,dyoSaveSequence=0;
const dyoPendingSaves=new Map();
function saveLibraryInWorker(value){
 if(!dyoStorageWorker){
  dyoStorageWorker=new Worker('storage-worker.js?v=1');
  dyoStorageWorker.onmessage=({data:result})=>{
   const pending=dyoPendingSaves.get(result.id);if(!pending)return;
   dyoPendingSaves.delete(result.id);result.error?pending.reject(Error(result.error)):pending.resolve();
  };
  dyoStorageWorker.onerror=()=>{for(const pending of dyoPendingSaves.values())pending.reject(Error('Storage worker unavailable'));dyoPendingSaves.clear();dyoStorageWorker.terminate();dyoStorageWorker=null};
 }
 return new Promise((resolve,reject)=>{const id=++dyoSaveSequence;dyoPendingSaves.set(id,{resolve,reject});try{dyoStorageWorker.postMessage({id,value})}catch(error){dyoPendingSaves.delete(id);reject(error)}});
}
async function dyoSaveLibrary(value){
 // postMessage/IndexedDB take a snapshot; avoid cloning and serializing the entire
 // font on the UI thread every time a single variant is saved.
 try{await saveLibraryInWorker(value)}catch{
 const db=await dyoDB;
 await new Promise((resolve,reject)=>{const tx=db.transaction('library','readwrite');tx.objectStore('library').put(value,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
 }
 localStorage.setItem('dyo-large-library','1');localStorage.removeItem('dyo-v1');
}
async function dyoLoadLibrary(){
 if(localStorage.getItem('dyo-large-library')!=='1')return null;
 const db=await dyoDB;
 return new Promise((resolve,reject)=>{const req=db.transaction('library').objectStore('library').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
}
