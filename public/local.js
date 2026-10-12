'use strict';
(()=>{
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  const saved=read('dyo-preview-v1',null);
  if(saved&&Number.isFinite(saved.jitter))$('jitter').value=saved.jitter;
  const name=localStorage.getItem('dyo-font-name-v1');if(name!==null)$('fontName').value=name;
  window.dyoChanged=key=>{try{
    if(key==='fontName')localStorage.setItem('dyo-font-name-v1',$('fontName').value);
    if(key==='custom')localStorage.setItem('dyo-custom-chars-v1',JSON.stringify(groups.custom));
    if(key==='preview')localStorage.setItem('dyo-preview-v1',JSON.stringify({jitter:+$('jitter').value}));
  }catch{toast('השמירה המקומית נכשלה. הורד גיבוי.')}};
  $('fontName').addEventListener('input',()=>window.dyoChanged('fontName'));
  for(const id of ['jitter'])$(id).addEventListener('input',()=>window.dyoChanged('preview'));
  dyoLoadLibrary().then(async saved=>{
   if(saved)data=saved;
   const repairKey='dyo-remove-incorrect-zayin-v1';
   if(localStorage.getItem(repairKey)!=='done'){
    if(data.glyphs['ז']){delete data.glyphs['ז'];await dyoSaveLibrary(data)}
    localStorage.setItem(repairKey,'done');
   }
   for(const c of Object.keys(data.glyphs))if(!Object.values(groups).flat().includes(c))groups.custom.push(c);
   stats();pick(char);renderDoc();
  }).catch(()=>toast('לא ניתן לפתוח את הספרייה המקומית')).finally(restoreLiveDraft);
  renderDoc();
})();
