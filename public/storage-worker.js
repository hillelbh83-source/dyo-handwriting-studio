'use strict';
const storageDatabase=new Promise((resolve,reject)=>{
 const request=indexedDB.open('dyo-local',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('library');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
let pendingSave=Promise.resolve();
self.onmessage=({data:{id,value}})=>{
 // Commit in request order, so an older save cannot replace a newer edit.
 pendingSave=pendingSave.catch(()=>{}).then(async()=>{
  try{
   const db=await storageDatabase;
   await new Promise((resolve,reject)=>{
    const tx=db.transaction('library','readwrite');tx.objectStore('library').put(value,'current');
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
   });
   self.postMessage({id});
  }catch(error){self.postMessage({id,error:error.message||'Storage failed'})}
 });
};
