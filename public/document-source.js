'use strict';
// Documents containing embedded images can exceed localStorage's quota.
// Store the complete portable source atomically in a separate IndexedDB store.
const dyoDocumentDatabase=new Promise((resolve,reject)=>{
 const request=indexedDB.open('dyo-documents',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('documents');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
let dyoDocumentSaveQueue=Promise.resolve(),dyoDocumentRevision=0,dyoDocumentFileName='',dyoDocumentReport=null,dyoDocumentAssets={},dyoDocumentAssetRevision=0;
function saveDocumentSource(source){
 const snapshot={source,fileName:dyoDocumentFileName,report:dyoDocumentReport,assets:dyoDocumentAssets};
 const save=dyoDocumentSaveQueue.catch(()=>{}).then(async()=>{
  const db=await dyoDocumentDatabase;
  await new Promise((resolve,reject)=>{const tx=db.transaction('documents','readwrite');tx.objectStore('documents').put(snapshot,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  try{localStorage.setItem('dyo-document-indexed-v1','1');
  // Leave a compatible copy for small text documents; never substitute a partial source.
  if(source.length<1000000)localStorage.setItem('dyo-document-v1',source);else localStorage.removeItem('dyo-document-v1');}catch{}
 });
 dyoDocumentSaveQueue=save;return save;
}
async function restoreDocumentSource(){
 const revision=dyoDocumentRevision;
 try{
  const db=await dyoDocumentDatabase;
  const record=await new Promise((resolve,reject)=>{const req=db.transaction('documents').objectStore('documents').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  if(revision!==dyoDocumentRevision)return;
  if(record&&typeof record.source==='string'){if(!sessionStorage.getItem('dyo-live-draft'))$('md').value=record.source;dyoDocumentFileName=record.fileName||'';dyoDocumentReport=record.report||null;dyoDocumentAssets=record.assets||{};dyoDocumentAssetRevision++;showDocumentImportReport();renderDoc()}
 }catch{toast('לא ניתן לשחזר את המסמך. שמרו עותק של הטקסט לפני סגירה.')}
}
function showDocumentImportReport(){
 const area=$('documentImportReport');area.replaceChildren();area.hidden=!dyoDocumentReport;
 if(dyoDocumentFileName){const bdi=document.createElement('bdi');bdi.textContent=dyoDocumentFileName;$('documentFileName').replaceChildren('נטען: ',bdi);$('documentFileName').classList.add('loaded')}
 if(!dyoDocumentReport)return;
 const {stats,warnings}=dyoDocumentReport,summary=document.createElement('p');
 summary.className='import-summary';summary.textContent=`Word הומר למסמך עריך · ${stats.paragraphs} פסקאות · ${stats.equations} נוסחאות · ${stats.images===1?'תמונה אחת':stats.images+' תמונות'} · ${stats.tables===1?'טבלה אחת':stats.tables+' טבלאות'}`;area.append(summary);
 const note=document.createElement('p');note.textContent='התוכן הותאם לסגנון המחברת ולכתב שלכם. בדקו את התצוגה לפני הורדת PDF.';area.append(note);
 if(warnings.length){const details=document.createElement('details'),title=document.createElement('summary'),list=document.createElement('ul');title.textContent='פריטים שכדאי לבדוק ('+warnings.length+')';details.append(title);for(const warning of warnings){const li=document.createElement('li');li.textContent=warning;list.append(li)}details.append(list);area.append(details)}
}
async function importDocumentFile(file){
 if($('docPaper').dataset.exporting==='true')return;
 const word=/\.docx$/i.test(file.name);
 if(!word&&!/\.(md|txt)$/i.test(file.name))return toast('בחרו קובץ DOCX, Markdown או TXT');
 if(file.size>(word?dyoDocxLimit:35*1024*1024))return toast(word?'בחרו קובץ Word עד 25 MB':'בחרו קובץ טקסט עד 35 MB');
 if($('md').value.trim()&&$('md').value!==demoDocument()&&!confirm('טעינת המסמך תחליף את התוכן בעורך. שמרתם עותק של המסמך הנוכחי?'))return;
 const controls=[...document.querySelectorAll('#document button,#document input,#document textarea,#tabs button')],disabled=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);$('documentImportReport').hidden=true;
 const previous={source:$('md').value,fileName:dyoDocumentFileName,report:dyoDocumentReport,assets:dyoDocumentAssets};
 try{
  clearTimeout(documentTimer);cancelDocumentRender();
  const result=word?await convertWordDocument(file,text=>{$('docState').textContent=text}):{source:await file.text()};
  // Do not replace the user's current editor until conversion and storage succeed.
  const compact=compactDocumentImages(result.source);result.source=compact.source;dyoDocumentAssets=compact.assets;dyoDocumentAssetRevision++;
  dyoDocumentFileName=file.name;dyoDocumentReport=word?{stats:result.stats,warnings:result.warnings}:null;
  await saveDocumentSource(result.source);
  dyoDocumentRevision++;$('md').value=result.source;showDocumentImportReport();
  await renderDoc({immediate:true});if($('docPaper').dataset.mathReady!=='true')throw Error('התצוגה לא הושלמה. בדקו את הקובץ ונסו שוב.');toast(word?'מסמך ה־Word מוכן לעריכה ולייצוא PDF':'המסמך נטען');
 }catch(error){dyoDocumentFileName=previous.fileName;dyoDocumentReport=previous.report;dyoDocumentAssets=previous.assets;dyoDocumentAssetRevision++;if($('md').value!==previous.source){$('md').value=previous.source;await saveDocumentSource(previous.source).catch(()=>{});renderDoc()}showDocumentImportReport();$('docState').textContent='הטעינה לא הושלמה — המסמך הקודם נשמר';toast(error.message||'לא ניתן לטעון את המסמך. הקובץ הקודם נשמר.');console.error('Document import failed:',error)}
 finally{controls.forEach((c,i)=>c.disabled=disabled[i]);$('mdFile').value=''}
}

function compactDocumentImages(source){
 const assets={},urls=new Map();let sequence=0;
 const compact=source.replace(/data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+/gi,url=>{
  let id=urls.get(url);if(!id){id='image-'+(++sequence);urls.set(url,id);assets[id]=url}return 'dyo-image:'+id;
 });
 return {source:compact,assets};
}
function portableDocumentSource(source){return source.replace(/dyo-image:([a-z0-9-]+)/gi,(match,id)=>dyoDocumentAssets[id]||match)}
