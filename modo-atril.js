/* Claret Music · Modo atril 2. Lectura de celebraciones compartidas. */
(function () {
  'use strict';
  if (window.cmAtrilOpen && window.cmAtrilVersion === 2) return;
  window.cmAtrilVersion = 2;
  const red = '#b9212b';
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state = null;
  const isChordToken = token => {
    // Spanish and international notation, including joined chords (MI-SI7, do#m-LA).
    const note = '(?:DO|RE|MI|FA|SOL|LA|SI|[A-G])';
    const one = note + '(?:#|b)?(?:maj|min|sus|dim|aug|add|m|M|º|°|[+])?(?:[-–—]?[0-9]+)?(?:/(?:[A-G](?:#|b)?|[0-9]+))?';
    return new RegExp('^(?:' + one + ')(?:[-–—](?:' + one + '))*(?:\\(' + note + '\\))?$', 'i').test(token);
  };
  const chordLine = line => {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    return tokens.length > 0 && tokens.every(isChordToken);
  };
  function getSongs() {
    if (typeof cmReadonly === 'undefined' || !cmReadonly || !Array.isArray(cmReadonly.entries) || typeof songs === 'undefined') return [];
    return cmReadonly.entries.map(x => ({ moment: x.moment || '', song: songs[x.song] })).filter(x => x.song);
  }
  // Chord/lyric pairs are kept together and sliced at the SAME character offsets.
  function rows(body, columns) {
    const src = String(body || 'Letra no disponible').replace(/\r/g, '').split('\n');
    const result = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i];
      const paired = chordLine(a) && i + 1 < src.length && src[i + 1].trim() && !chordLine(src[i + 1]);
      if (paired) {
        const b = src[++i];
        const length = Math.max(a.length, b.length);
        for (let start = 0; start < length; ) {
          let end = Math.min(start + columns, length);
          if (end < length) {
            const cut = b.lastIndexOf(' ', end);
            if (cut > start + Math.floor(columns * .60)) end = cut + 1;
          }
          result.push([{text: a.slice(start, end), chord: true}, {text: b.slice(start, end), chord: false}]);
          start = end;
        }
      } else if (a.length === 0) {
        result.push([{text:' ',chord:false}]);
      } else {
        // A chord-only or lyric-only line: wrap without losing any character.
        for (let start = 0; start < a.length; ) {
          let end = Math.min(start + columns, a.length);
          if (end < a.length && !chordLine(a)) {
            const cut = a.lastIndexOf(' ', end);
            if (cut > start + Math.floor(columns * .60)) end = cut + 1;
          }
          result.push([{text:a.slice(start,end), chord:chordLine(a)}]);
          start = end;
        }
      }
    }
    return result;
  }
  function paginate(groups, maxLines) {
    const pages = []; let current=[], n=0;
    groups.forEach(group => {
      if (current.length && n + group.length > maxLines) { pages.push(current);current=[];n=0; }
      current.push(...group); n += group.length;
    });
    if (current.length || !pages.length) pages.push(current);
    return pages;
  }
  function getData() {
    const entry = getSongs()[state.songIndex];
    if (!entry) return null;
    const width = Math.max(245, window.innerWidth - 34);
    const height = Math.max(170, window.innerHeight - 166);
    const size = state.size;
    const columns = Math.max(14, Math.floor((width-22)/(size * .615)));
    const count = Math.max(3, Math.floor((height-26)/(size*1.43)));
    return {entry, pages:paginate(rows(entry.song.body, columns),count)};
  }
  function draw() {
    if (!state) return;
    const panel = document.getElementById('cm-at-panel');
    const d = getData(); if (!panel || !d) return;
    state.page = Math.min(state.page, d.pages.length-1);
    const options = getSongs().map((x,i)=>'<option value="'+i+'"'+(state.songIndex===i?' selected':'')+'>'+esc(x.song.title)+'</option>').join('');
    panel.innerHTML = '<div class="cm-at-top"><button type="button" onclick="cmAtrilClose()">✕ Salir</button><select aria-label="Elegir canción" onchange="cmAtrilSong(Number(this.value))">'+options+'</select><button type="button" onclick="cmAtrilSize(-2)">A−</button><button type="button" onclick="cmAtrilSize(2)">A+</button></div>'+
      '<div class="cm-at-heading">'+esc(d.entry.moment)+' · '+esc(d.entry.song.title)+'</div>'+
      '<div class="cm-at-page" style="font-size:'+state.size+'px">'+d.pages[state.page].map(line=>'<div class="cm-at-line'+(line.chord?' cm-at-chord':'')+'">'+(line.text ? esc(line.text) : '&nbsp;')+'</div>').join('')+'</div>'+
      '<div class="cm-at-bottom"><button type="button" onclick="cmAtrilPrev()"'+(state.page===0 && state.songIndex===0?' disabled':'')+'>← Anterior</button><span>'+(state.page+1)+' / '+d.pages.length+'</span><button type="button" onclick="cmAtrilNext()"'+(state.songIndex===getSongs().length-1 && state.page===d.pages.length-1?' disabled':'')+'>Siguiente →</button></div>';
  }
  window.cmAtrilOpen = function(index) {
    const all = getSongs(); if (!all.length) {alert('Abre primero una celebración compartida.');return;}
    document.getElementById('cm-at-panel')?.remove();
    const idx = Number(index);
    state = {songIndex:Number.isInteger(idx) && idx >= 0 && idx < all.length?idx:0,page:0,size:20};
    const panel=document.createElement('div');panel.id='cm-at-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Modo atril');document.body.appendChild(panel);draw();
  };
  window.cmAtrilClose = function(){state=null;document.getElementById('cm-at-panel')?.remove()};
  window.cmAtrilSong = function(i){if(!state)return;state.songIndex=i;state.page=0;draw()};
  window.cmAtrilSize = function(delta){if(!state)return;state.size=Math.max(14,Math.min(28,state.size+delta));state.page=0;draw()};
  window.cmAtrilNext = function(){if(!state)return;const d=getData();if(state.page<d.pages.length-1)state.page++;else if(state.songIndex<getSongs().length-1){state.songIndex++;state.page=0}draw()};
  window.cmAtrilPrev = function(){if(!state)return;if(state.page>0)state.page--;else if(state.songIndex>0){state.songIndex--;state.page=getData().pages.length-1}draw()};
  const style=document.createElement('style');style.textContent=`#cm-at-panel{box-sizing:border-box;position:fixed;inset:0;z-index:2147483600;background:#fffaf0;color:#252525;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 8px env(safe-area-inset-bottom);font-family:system-ui,sans-serif}#cm-at-panel *{box-sizing:border-box}#cm-at-panel .cm-at-top{display:flex;gap:5px;align-items:center;padding:7px 2px;flex-shrink:0}#cm-at-panel button,#cm-at-panel select{border:1px solid #dec2b8;background:white;border-radius:9px;padding:9px 6px;color:#7c222b;font-size:13px}#cm-at-panel button:disabled{opacity:.35}#cm-at-panel select{flex:1;min-width:0;max-width:100%}#cm-at-panel .cm-at-heading{text-align:center;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}#cm-at-panel .cm-at-page{flex:1;min-height:0;overflow:hidden;padding:12px 9px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;line-height:1.43}#cm-at-panel .cm-at-line{white-space:pre;height:1.43em}#cm-at-panel .cm-at-chord{color:${red};font-weight:700}#cm-at-panel .cm-at-bottom{flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 2px}#cm-at-panel .cm-at-bottom button{flex:1}#cm-at-panel .cm-at-bottom span{font-size:12px;white-space:nowrap}`;document.head.appendChild(style);
  // Restore the button after the app redraws a shared celebration.
  function addButton(){
    if (typeof cmReadonly==='undefined' || !cmReadonly) return;
    const actions=document.querySelector('.cm-read + .cm-actions');
    if (!actions || document.getElementById('cm-at-button')) return;
    const button=document.createElement('button');button.id='cm-at-button';button.type='button';button.textContent='🎸 Modo atril';button.onclick=()=>window.cmAtrilOpen(0);actions.appendChild(button);
  }
  if (typeof cmRenderRead==='function') {
    const original=cmRenderRead;
    cmRenderRead=function(){original();addButton()};
  }
  addButton();
  window.addEventListener('resize',()=>{if(state)draw()});
})();
