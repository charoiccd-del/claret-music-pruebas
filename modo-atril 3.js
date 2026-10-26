/* Claret Music · Modo atril 3 · alineación y paginación móvil */
(function () {
  'use strict';
  const red = '#b9212b';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state = null;
  // Accept standard, Spanish, compound, slash and parenthesized chord notation.
  const note = '(?:DO|RE|MI|FA|SOL|LA|SI|[A-G])';
  const one = note + '(?:#|b)?(?:maj|min|sus|dim|aug|add|m|M|º|°|[+])?(?:[-–—]?[0-9]+)?(?:/(?:[A-G](?:#|b)?|[0-9]+))?';
  const chordPattern = new RegExp('^(?:' + one + ')(?:[-–—](?:' + one + '))*(?:\\(' + note + '\\))?$', 'i');
  const isChordToken = token => chordPattern.test(token.replace(/^\(|\)$/g, ''));
  const isChordLine = line => {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    return tokens.length > 0 && tokens.every(isChordToken);
  };
  function songsInCelebration() {
    if (typeof cmReadonly === 'undefined' || !cmReadonly || !Array.isArray(cmReadonly.entries) || typeof songs === 'undefined') return [];
    return cmReadonly.entries.map(x => ({moment:x.moment || '', song:songs[x.song]})).filter(x => x.song);
  }
  // Keep original character positions. A chord line and its lyric line are a single block.
  function blocks(body) {
    const lines = String(body || 'Letra no disponible').replace(/\r/g,'').split('\n');
    const result=[];
    for(let i=0;i<lines.length;i++) {
      const chord=isChordLine(lines[i]);
      if (chord && i+1<lines.length && lines[i+1].trim() && !isChordLine(lines[i+1])) {
        result.push({lines:[{text:lines[i],chord:true},{text:lines[++i],chord:false}],pair:true});
      } else result.push({lines:[{text:lines[i] || ' ',chord}],pair:false});
    }
    return result;
  }
  // Prefer breaking at a space common to both rows and never within a chord token.
  function splitBlock(block, columns) {
    let rows=block.lines;
    const len=Math.max(...rows.map(x=>x.text.length));
    if(len<=columns) return [rows];
    const out=[];let start=0;
    while(start<len){
      let limit=Math.min(len,start+columns),end=limit;
      if(end<len){
        const preferred=[];
        for(let pos=start+Math.max(5,Math.floor(columns*.48));pos<=limit;pos++) {
          // A split must not fall within a chord token (including joined notation).
          let safe=true;
          for(const line of rows){
            if(line.chord){
              const left=line.text[pos-1] || ' ',right=line.text[pos] || ' ';
              if(left!==' ' && right!==' ') safe=false;
            }
          }
          if(safe && rows.some(line => !line.chord && line.text[pos-1]===' ')) preferred.push(pos);
        }
        if(preferred.length) end=preferred[preferred.length-1];
        else {
          // Keep chord clusters together, accepting a shorter preceding segment.
          for(let pos=limit;pos>start+1;pos--){
            if(rows.every(line=>!line.chord || (line.text[pos-1]||' ')===' ' || (line.text[pos]||' ')===' ')){end=pos;break;}
          }
        }
      }
      if(end<=start)end=limit;
      out.push(rows.map(line=>({text:line.text.slice(start,end),chord:line.chord})));
      start=end;
    }
    return out;
  }
  function paginate(groups,maxLines){
    const pages=[];let page=[],count=0;
    for(const group of groups){
      if(page.length && count+group.length>maxLines){pages.push(page);page=[];count=0;}
      page.push(...group);count+=group.length;
    }
    if(page.length||!pages.length) pages.push(page);
    return pages;
  }
  function data(){
    const entry=songsInCelebration()[state.songIndex];if(!entry)return null;
    const width=Math.max(230,window.innerWidth-38),height=Math.max(200,window.innerHeight-170);
    const columns=Math.max(14,Math.floor((width-18)/(state.size*.615)));
    const maxLines=Math.max(3,Math.floor((height-30)/(state.size*1.43)));
    const groups=blocks(entry.song.body).flatMap(block=>splitBlock(block,columns));
    return {entry,pages:paginate(groups,maxLines)};
  }
  function draw(){
    if(!state)return;const panel=document.getElementById('cm-at-panel'),d=data();if(!panel||!d)return;
    state.page=Math.min(state.page,d.pages.length-1);
    const options=songsInCelebration().map((x,i)=>'<option value="'+i+'"'+(i===state.songIndex?' selected':'')+'>'+esc(x.song.title)+'</option>').join('');
    panel.innerHTML='<div class="cm-at-top"><button onclick="cmAtrilClose()">✕ Salir</button><select aria-label="Elegir canción" onchange="cmAtrilSong(Number(this.value))">'+options+'</select><button onclick="cmAtrilSize(-2)">A−</button><button onclick="cmAtrilSize(2)">A+</button></div>'+
      '<div class="cm-at-heading">'+esc(d.entry.moment)+' · '+esc(d.entry.song.title)+'</div>'+
      '<div class="cm-at-page" style="font-size:'+state.size+'px">'+d.pages[state.page].map(line=>'<div class="cm-at-line'+(line.chord?' cm-at-chord':'')+'">'+(line.text?esc(line.text):'&nbsp;')+'</div>').join('')+'</div>'+
      '<div class="cm-at-bottom"><button onclick="cmAtrilPrev()"'+(state.page===0&&state.songIndex===0?' disabled':'')+'>← Anterior</button><span>'+(state.page+1)+' / '+d.pages.length+'</span><button onclick="cmAtrilNext()"'+(state.songIndex===songsInCelebration().length-1&&state.page===d.pages.length-1?' disabled':'')+'>Siguiente →</button></div>';
  }
  window.cmAtrilOpen=function(index){
    const all=songsInCelebration();if(!all.length){alert('Abre primero una celebración compartida.');return;}
    document.getElementById('cm-at-panel')?.remove();
    const idx=Number(index);state={songIndex:Number.isInteger(idx)&&idx>=0&&idx<all.length?idx:0,page:0,size:20};
    const panel=document.createElement('div');panel.id='cm-at-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Modo atril');document.body.appendChild(panel);draw();
  };
  window.cmAtrilClose=function(){state=null;document.getElementById('cm-at-panel')?.remove();};
  window.cmAtrilSong=function(i){if(!state)return;state.songIndex=i;state.page=0;draw();};
  window.cmAtrilSize=function(n){if(!state)return;state.size=Math.max(14,Math.min(28,state.size+n));state.page=0;draw();};
  window.cmAtrilNext=function(){if(!state)return;const d=data();if(state.page<d.pages.length-1)state.page++;else if(state.songIndex<songsInCelebration().length-1){state.songIndex++;state.page=0;}draw();};
  window.cmAtrilPrev=function(){if(!state)return;if(state.page>0)state.page--;else if(state.songIndex>0){state.songIndex--;state.page=data().pages.length-1;}draw();};
  const style=document.createElement('style');style.textContent=`#cm-at-panel{box-sizing:border-box;position:fixed;inset:0;z-index:2147483600;background:#fffaf0;color:#252525;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 8px env(safe-area-inset-bottom);font-family:system-ui,sans-serif}#cm-at-panel *{box-sizing:border-box}#cm-at-panel .cm-at-top{display:flex;gap:5px;align-items:center;padding:7px 2px;flex-shrink:0}#cm-at-panel button,#cm-at-panel select{border:1px solid #dec2b8;background:white;border-radius:9px;padding:9px 6px;color:#7c222b;font-size:13px}#cm-at-panel button:disabled{opacity:.35}#cm-at-panel select{flex:1;min-width:0;max-width:100%}#cm-at-panel .cm-at-heading{text-align:center;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}#cm-at-panel .cm-at-page{flex:1;min-height:0;overflow:hidden;padding:12px 9px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;line-height:1.43}#cm-at-panel .cm-at-line{white-space:pre;height:1.43em}#cm-at-panel .cm-at-chord{color:${red};font-weight:700}#cm-at-panel .cm-at-bottom{flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 2px}#cm-at-panel .cm-at-bottom button{flex:1}#cm-at-panel .cm-at-bottom span{font-size:12px;white-space:nowrap}`;document.head.appendChild(style);
  function addButton(){
    if(typeof cmReadonly==='undefined'||!cmReadonly)return;
    const actions=document.querySelector('.cm-read + .cm-actions');
    if(!actions||document.getElementById('cm-at-button'))return;
    const b=document.createElement('button');b.id='cm-at-button';b.type='button';b.textContent='🎸 Modo atril';b.onclick=()=>window.cmAtrilOpen(0);actions.appendChild(b);
  }
  if(typeof cmRenderRead==='function'){
    const original=cmRenderRead;cmRenderRead=function(){original();addButton();};
  }
  addButton();window.addEventListener('resize',()=>{if(state)draw();});
})();
