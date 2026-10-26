/* Claret Music · Modo atril: corrección general de acordes y distribución. */
(function () {
  'use strict';
  window.cmAtrilVersion = 4;
  const red = '#b9212b';
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state = null;
  const note = '(?:DO|RE|MI|FA|SOL|LA|SI|[A-G])';
  const one = note + '(?:#|b)?(?:maj|min|sus|dim|aug|add|m|M|º|°|[+])?(?:-?[0-9]+)?(?:/(?:' + note + '|[0-9]+))?';
  const chordRE = new RegExp('^(?:' + one + ')(?:-(?:' + one + '))*(?:\\(' + note + '\\))?$', 'i');
  function normalize(s) { return s.replace(/[‐‑‒–—−]/g, '-'); }
  function isChordToken(raw) {
    let s = normalize(raw.trim());
    if (s[0] === '(' && s[s.length - 1] === ')') s = s.slice(1,-1);
    return !!s && chordRE.test(s);
  }
  function chordLine(line) {
    const tokens = String(line).trim().split(/\s+/).filter(Boolean);
    return tokens.length > 0 && tokens.every(isChordToken);
  }
  function getSongs() {
    if (typeof cmReadonly === 'undefined' || !cmReadonly || !Array.isArray(cmReadonly.entries) || typeof songs === 'undefined') return [];
    return cmReadonly.entries.map(x => ({moment:x.moment || '', song:songs[x.song]})).filter(x => x.song);
  }
  // Split two aligned lines ONLY at a shared character boundary. Never cut through a chord.
  function pairRows(chords, lyric, columns) {
    const out=[], len=Math.max(chords.length,lyric.length);
    let start=0;
    while(start<len) {
      const nominal=Math.min(start+columns,len);
      let end=nominal;
      if (end<len) {
        const min=Math.min(start+Math.max(4,Math.floor(columns*.55)),nominal);
        // Prefer a word boundary in the lyric, but never cross a chord token.
        for(let k=nominal;k>=min;k--) {
          if (lyric[k-1] !== ' ' && lyric[k] !== ' ') continue;
          if (splitsChord(chords,k)) continue;
          end=k;break;
        }
        if(splitsChord(chords,end)) {
          let k=end;
          while(k>start+1 && splitsChord(chords,k)) k--;
          if(k>start+1) end=k;
          else {
            k=end;while(k<len && splitsChord(chords,k)) k++;
            end=k;
          }
        }
      }
      if(end<=start) end=Math.min(start+columns,len);
      out.push([{text:chords.slice(start,end),chord:true},{text:lyric.slice(start,end),chord:false}]);
      start=end;
    }
    return out.length?out:[[{text:' ',chord:false}]];
  }
  function splitsChord(s,at) { return at>0 && at<s.length && !/\s/.test(s[at-1]) && !/\s/.test(s[at]); }
  function loneRows(line,columns,chord) {
    if(!line.length) return [[{text:' ',chord:false}]];
    const result=[];
    let start=0;
    while(start<line.length) {
      let end=Math.min(start+columns,line.length);
      if(end<line.length) {
        const min=start+Math.floor(columns*.50);
        let cut=-1;
        for(let i=end;i>min;i--) if(/\s/.test(line[i-1])) {cut=i;break;}
        if(cut>start) end=cut;
        // For one uninterrupted sequence of joined chords, break at a hyphen.
        else if(chord) for(let i=end;i>min;i--) if(/[‐‑‒–—−-]/.test(line[i-1])) {end=i;break;}
      }
      result.push([{text:line.slice(start,end),chord}]);
      start=end;
    }
    return result;
  }
  function rows(body,columns) {
    const lines=String(body || 'Letra no disponible').replace(/\r/g,'').split('\n');
    const result=[];
    for(let i=0;i<lines.length;i++) {
      const a=lines[i], aChord=chordLine(a);
      if(aChord && i+1<lines.length && lines[i+1].trim() && !chordLine(lines[i+1])) {
        result.push(...pairRows(a,lines[++i],columns));
      } else result.push(...loneRows(a,columns,aChord));
    }
    return result;
  }
  function paginate(groups,maxLines) {
    const pages=[];let cur=[],count=0;
    for(const g of groups) {
      if(cur.length && count+g.length>maxLines) {pages.push(cur);cur=[];count=0;}
      cur.push(...g);count+=g.length;
    }
    if(cur.length || !pages.length) pages.push(cur);
    return pages;
  }
  function getData() {
    const entry=getSongs()[state.songIndex];if(!entry)return null;
    const panel=document.getElementById('cm-at-panel');
    const width=Math.max(230,panel?.clientWidth || window.innerWidth);
    const height=Math.max(280,panel?.clientHeight || window.innerHeight);
    const size=state.size;
    const columns=Math.max(15,Math.floor((width-36)/(size*.615)));
    const maxLines=Math.max(4,Math.floor((height-166)/(size*1.43)));
    return {entry,pages:paginate(rows(entry.song.body,columns),maxLines)};
  }
  function draw() {
    if(!state)return;
    const panel=document.getElementById('cm-at-panel'),d=getData();if(!panel||!d)return;
    state.page=Math.min(state.page,d.pages.length-1);
    const options=getSongs().map((x,i)=>'<option value="'+i+'"'+(state.songIndex===i?' selected':'')+'>'+esc(x.song.title)+'</option>').join('');
    panel.innerHTML='<div class="cm-at-top"><button type="button" onclick="cmAtrilClose()">✕ Salir</button><select aria-label="Elegir canción" onchange="cmAtrilSong(Number(this.value))">'+options+'</select><button type="button" onclick="cmAtrilSize(-2)">A−</button><button type="button" onclick="cmAtrilSize(2)">A+</button></div>'+
      '<div class="cm-at-heading">'+esc(d.entry.moment)+' · '+esc(d.entry.song.title)+'</div>'+
      '<div class="cm-at-page" style="font-size:'+state.size+'px">'+d.pages[state.page].map(line=>'<div class="cm-at-line'+(line.chord?' cm-at-chord':'')+'">'+(line.text?esc(line.text):'&nbsp;')+'</div>').join('')+'</div>'+
      '<div class="cm-at-bottom"><button type="button" onclick="cmAtrilPrev()"'+(state.page===0 && state.songIndex===0?' disabled':'')+'>← Anterior</button><span>'+(state.page+1)+' / '+d.pages.length+'</span><button type="button" onclick="cmAtrilNext()"'+(state.songIndex===getSongs().length-1&&state.page===d.pages.length-1?' disabled':'')+'>Siguiente →</button></div>';
  }
  window.cmAtrilOpen=function(index){
    const all=getSongs();if(!all.length){alert('Abre primero una celebración compartida.');return;}
    document.getElementById('cm-at-panel')?.remove();
    const idx=Number(index);state={songIndex:Number.isInteger(idx)&&idx>=0&&idx<all.length?idx:0,page:0,size:20};
    const panel=document.createElement('div');panel.id='cm-at-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Modo atril');document.body.appendChild(panel);draw();
  };
  window.cmAtrilClose=function(){state=null;document.getElementById('cm-at-panel')?.remove()};
  window.cmAtrilSong=function(i){if(!state)return;state.songIndex=i;state.page=0;draw()};
  window.cmAtrilSize=function(delta){if(!state)return;state.size=Math.max(14,Math.min(28,state.size+delta));state.page=0;draw()};
  window.cmAtrilNext=function(){if(!state)return;const d=getData();if(state.page<d.pages.length-1)state.page++;else if(state.songIndex<getSongs().length-1){state.songIndex++;state.page=0}draw()};
  window.cmAtrilPrev=function(){if(!state)return;if(state.page>0)state.page--;else if(state.songIndex>0){state.songIndex--;state.page=getData().pages.length-1}draw()};
  document.getElementById('cm-at-style')?.remove();
  const style=document.createElement('style');style.id='cm-at-style';style.textContent=`#cm-at-panel{box-sizing:border-box;position:fixed;inset:0;z-index:2147483600;background:#fffaf0;color:#252525;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 8px env(safe-area-inset-bottom);font-family:system-ui,sans-serif}#cm-at-panel *{box-sizing:border-box}#cm-at-panel .cm-at-top{display:flex;gap:5px;align-items:center;padding:7px 2px;flex-shrink:0}#cm-at-panel button,#cm-at-panel select{border:1px solid #dec2b8;background:white;border-radius:9px;padding:9px 6px;color:#7c222b;font-size:13px}#cm-at-panel button:disabled{opacity:.35}#cm-at-panel select{flex:1;min-width:0;max-width:100%}#cm-at-panel .cm-at-heading{text-align:center;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}#cm-at-panel .cm-at-page{flex:1;min-height:0;overflow:hidden;padding:12px 9px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;line-height:1.43}#cm-at-panel .cm-at-line{white-space:pre;height:1.43em}#cm-at-panel .cm-at-chord{color:${red};font-weight:700}#cm-at-panel .cm-at-bottom{flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 2px}#cm-at-panel .cm-at-bottom button{flex:1}#cm-at-panel .cm-at-bottom span{font-size:12px;white-space:nowrap}`;document.head.appendChild(style);
  function addButton(){
    if(typeof cmReadonly==='undefined'||!cmReadonly)return;
    const actions=document.querySelector('.cm-read + .cm-actions');
    if(!actions||document.getElementById('cm-at-button'))return;
    const button=document.createElement('button');button.id='cm-at-button';button.type='button';button.textContent='🎸 Modo atril';button.onclick=()=>window.cmAtrilOpen(0);actions.appendChild(button);
  }
  if(typeof cmRenderRead==='function'){
    const original=cmRenderRead;cmRenderRead=function(){original();addButton()};
  }
  addButton();window.addEventListener('resize',()=>{if(state)draw()});
})();
