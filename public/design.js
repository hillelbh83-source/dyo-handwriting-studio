/* Presentation only. No changes to saved glyphs, settings or synchronization. */
(() => {
  const paths={
    download:'M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4',
    upload:'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
    sync:'M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5m-4 9a8 8 0 0 0 14 2l3-3m0 5v-5h-5',
    undo:'M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12',
    next:'M20 12H4m6-6-6 6 6 6',
    plus:'M12 5v14M5 12h14',
    erase:'m15 3 6 6-11 11H6l-4-4L15 3ZM8 10l7 7M10 20h12',
    pen:'m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5',
    eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    doc:'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 13h8M8 17h6',
    print:'M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v8H6v-8',
    restore:'M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2',
    external:'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7'
  };
  const icons={chooseDocument:'upload',toggleTextStyle:'pen',backup:'download',import:'upload',nextMissing:'next',undo:'undo',clear:'erase',saveGlyph:'plus',addCharacter:'plus',smart:'pen',shuffle:'sync',fontExport:'download',print:'print',renderDoc:'sync',loadDemo:'doc',openStudio:'external',resetMetrics:'restore'};
  function decorate(el,name){if(!el)return;el.dataset.icon=name;const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]}"/></svg>`;el.style.setProperty('--icon',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);}
  for(const [id,name] of Object.entries(icons))decorate(document.getElementById(id),name);
  document.querySelectorAll('#tabs button').forEach((el,i)=>decorate(el,['pen','doc','download'][i]));
})();

// Keep the phone dock out of the way when the on-screen keyboard is open.
(()=>{
 const viewport=window.visualViewport;if(!viewport)return;
 let restingHeight=viewport.height;
 const update=()=>{
  const field=document.activeElement;
  const editing=field?.matches('textarea,input:not([type="range"]):not([type="checkbox"]):not([type="file"])');
  if(!editing&&viewport.scale===1)restingHeight=viewport.height;
  document.body.classList.toggle('keyboard-open',Boolean(editing&&viewport.scale===1&&restingHeight-viewport.height>140));
 };
 viewport.addEventListener('resize',update);document.addEventListener('focusin',update);document.addEventListener('focusout',()=>setTimeout(update,100));
 window.addEventListener('orientationchange',()=>{restingHeight=window.innerHeight;update()});
})();
