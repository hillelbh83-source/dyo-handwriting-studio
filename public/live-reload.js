'use strict';
function restoreLiveDraft(){
 try{
  const saved=JSON.parse(sessionStorage.getItem('dyo-live-draft'));if(!saved)return;
  $('group').value=saved.group;pick(saved.char);strokes=saved.strokes;editIndex=saved.editIndex;draw();
  if(editIndex!==null)$('saveGlyph').textContent='עדכון גרסה '+(editIndex+1);
  for(const [id,value] of Object.entries(saved.fields))if($(id))$(id).value=value;
  $('normalize').checked=saved.normalize;
  openTab(tabFromAddress(),false);
  $('textStylePanel').hidden=!saved.styleOpen;$('toggleTextStyle').setAttribute('aria-expanded',String(saved.styleOpen));
  renderDoc();window.scrollTo(saved.scrollX,saved.scrollY);
  const focused=$(saved.focus);if(focused){focused.focus({preventScroll:true});if(saved.selection&&focused.setSelectionRange)focused.setSelectionRange(...saved.selection)}
  sessionStorage.removeItem('dyo-live-draft');
 }catch{toast('לא ניתן לשחזר את העריכה אחרי העדכון')}
}
(()=>{
 let version=null,reloading=false;
 const connection=new EventSource('/__live');
 connection.onmessage=async event=>{
  const update=JSON.parse(event.data);if(version===null){version=update.version;return}if(version===update.version||reloading)return;version=update.version;
  if(update.cssOnly){for(const link of document.querySelectorAll('link[rel="stylesheet"]')){const url=new URL(link.href);url.searchParams.set('live',version);link.href=url.href}return}
  reloading=true;
  try{
   const focused=document.activeElement,fields={};for(const id of ['md','fontName','customCharacter','pen','jitter'])fields[id]=$(id).value;
   sessionStorage.setItem('dyo-live-draft',JSON.stringify({char,group:$('group').value,strokes,editIndex,fields,normalize:$('normalize').checked,tab:document.querySelector('#tabs .active').dataset.tab,styleOpen:!$('textStylePanel').hidden,scrollX:window.scrollX,scrollY:window.scrollY,focus:focused.id,selection:typeof focused.selectionStart==='number'?[focused.selectionStart,focused.selectionEnd]:null}));
   localStorage.setItem('dyo-document-v1',$('md').value);window.dyoChanged('preview');window.dyoChanged('fontName');
   await dyoSaveLibrary(data);location.reload();
  }catch{reloading=false;toast('העדכון ממתין: לא ניתן לשמור את העריכה. הורד גיבוי לפני רענון.')}
 };
})();
