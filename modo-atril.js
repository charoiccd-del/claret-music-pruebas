/* Claret Music - Modo atril, módulo adicional de prueba. No cambia el catálogo. */
(function(){
  'use strict';
  const color='#b9212b';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state=null;
  const chord=/^(?:[A-G](?:#|b)?(?:m|maj|min|sus|dim|aug|add|M)?\d*(?:\/[A-G](?:#|b)?)?|DO|RE|MI|FA|SOL|LA|SI)(?:\s+|$)/i;
  function isChords(s){let words=s.trim().split(/\s+/);return words.length>0&&words.filter(w=>chord.test(w+' ')).length/words.length>=.7&&s.trim().length>0}
  function splitFixed(str,cols){let out=[];str=String(str);while(str.length>cols){let cut=str.lastIndexOf(' ',cols);if(cut<Math.floor(cols*.55))cut=cols;out.push(str.slice(0,cut).replace(/\s+$/,''));str=str.slice(cut).replace(/^\s+/,'')}out.push(str);return out}
  function linesForSong(body,cols){let arr=String(body||'Letra no disponible').replace(/\r/g,'').split('\n'),res=[];
    for(let i=0;i<arr.length;i++){
      let line=arr[i];
      if(isChords(line) && i+1<arr.length && arr[i+1].trim() && !isChords(arr[i+1])){
        let lyric=arr[++i], width=Math.max(line.length,lyric.length),off=0;
        while(off<width){let end=Math.min(off+cols,width);if(end<width){let a=lyric.lastIndexOf(' ',end);if(a>off+Math.floor(cols*.55))end=a+1}
          res.push({t:line.slice(off,end),ch:true});res.push({t:lyric.slice(off,end),ch:false});off=end}
      }else splitFixed(line,cols).forEach(t=>res.push({t,ch:isChords(line)}));
    }
    return res;
  }
  function allSongs(){return (cmReadonly?.entries||[]).map(x=>({moment:x.moment,s:songs[x.song]})).filter(x=>x.s)}
  function makePages(lines,maxLines){let pages=[],cur=[];for(const line of lines){if(cur.length>=maxLines){pages.push(cur);cur=[]}cur.push(line)}if(cur.length||!pages.length)pages.push(cur);return pages}
  function pageData(){let entry=allSongs()[state.songIndex];if(!entry)return null;
    let w=Math.max(285,window.innerWidth-36),h=Math.max(310,window.innerHeight-145);
    let fs=state.font,cols=Math.max(25,Math.floor((w-22)/(fs*.62))),maxLines=Math.max(5,Math.floor((h-35)/(fs*1.40)));
    return {entry,pages:makePages(linesForSong(entry.s.body,cols),maxLines),fs};
  }
  function renderAtril(){if(!state)return;let panel=document.getElementById('cm-at-panel');if(!panel)return;
    let d=pageData();if(!d)return;state.page=Math.min(state.page,d.pages.length-1);
    const opts=allSongs().map((x,i)=>'<option value="'+i+'" '+(i===state.songIndex?'selected':'')+'>'+esc(x.s.title)+'</option>').join('');
    panel.innerHTML='<div class="cm-at-head"><button onclick="cmAtrilClose()" aria-label="Cerrar modo atril">✕ Salir</button><select aria-label="Canción" onchange="cmAtrilSong(+this.value)">'+opts+'</select><button onclick="cmAtrilSize(-2)">A−</button><button onclick="cmAtrilSize(2)">A+</button></div><div class="cm-at-info">'+esc(d.entry.moment)+' · '+esc(d.entry.s.title)+'</div><div class="cm-at-paper" style="font-size:'+d.fs+'px">'+d.pages[state.page].map(l=>'<div class="cm-at-line'+(l.ch?' cm-at-chord':'')+'">'+(l.t?esc(l.t):'&nbsp;')+'</div>').join('')+'</div><div class="cm-at-foot"><button '+(state.page===0&&state.songIndex===0?'disabled':'')+' onclick="cmAtrilPrev()">← Anterior</button><span>Página '+(state.page+1)+' / '+d.pages.length+'</span><button onclick="cmAtrilNext()">Siguiente →</button></div>';
  }
  window.cmAtrilOpen=function(){if(!cmReadonly||!allSongs().length){alert('No hay canciones en esta celebración');return}state={songIndex:0,page:0,font:20};let e=document.createElement('div');e.id='cm-at-panel';e.setAttribute('role','dialog');e.setAttribute('aria-label','Modo atril');document.body.appendChild(e);renderAtril()};
  window.cmAtrilClose=function(){state=null;document.getElementById('cm-at-panel')?.remove()};
  window.cmAtrilSong=function(i){state.songIndex=i;state.page=0;renderAtril()};
  window.cmAtrilSize=function(delta){state.font=Math.max(14,Math.min(28,state.font+delta));state.page=0;renderAtril()};
  window.cmAtrilNext=function(){let d=pageData();if(state.page<d.pages.length-1)state.page++;else if(state.songIndex<allSongs().length-1){state.songIndex++;state.page=0}renderAtril()};
  window.cmAtrilPrev=function(){if(state.page>0)state.page--;else if(state.songIndex>0){state.songIndex--;state.page=pageData().pages.length-1}renderAtril()};
  let style=document.createElement('style');style.textContent='#cm-at-panel{position:fixed;inset:0;z-index:99999;background:#fffaf0;color:#222;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 8px env(safe-area-inset-bottom);font-family:system-ui,sans-serif}#cm-at-panel .cm-at-head{display:flex;gap:5px;align-items:center;padding:7px 2px}#cm-at-panel button,#cm-at-panel select{border:1px solid #edd6bf;background:#fff;border-radius:9px;padding:9px 7px;color:#6d2525;font-size:13px}#cm-at-panel select{flex:1;min-width:0}#cm-at-panel .cm-at-info{text-align:center;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#cm-at-panel .cm-at-paper{flex:1;min-height:0;overflow:hidden;padding:12px 8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;line-height:1.4}#cm-at-panel .cm-at-line{white-space:pre;height:1.4em}#cm-at-panel .cm-at-chord{color:'+color+';font-weight:700}#cm-at-panel .cm-at-foot{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:8px 2px}#cm-at-panel .cm-at-foot button{flex:1}#cm-at-panel .cm-at-foot span{font-size:12px;white-space:nowrap}';document.head.appendChild(style);
  // Añade el botón solo en la vista de una celebración compartida, sin alterar las funciones existentes.
  const original=cmRenderRead;
  cmRenderRead=function(){original();if(!document.getElementById('cm-at-button')){let actions=document.querySelector('.cm-read + .cm-actions');if(actions){let b=document.createElement('button');b.id='cm-at-button';b.textContent='🎸 Modo atril';b.onclick=cmAtrilOpen;actions.appendChild(b)}}};
  if(cmReadonly)cmRenderRead();
  window.addEventListener('resize',()=>{if(state)renderAtril()});
})();
