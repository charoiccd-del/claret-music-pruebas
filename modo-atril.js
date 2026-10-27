
/* Claret Music - Modo atril: alineación general */
(function () {
'use strict';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

const norm=s=>s.replace(/[‐-‒–—−]/g,'-');

const chordUnit='(?:SOL|DO|RE|MI|FA|LA|SI|[A-G])(?:#|b)?(?:maj|min|sus|dim|aug|add|m|M|º|°|\\+)?(?:-?[0-9]+)?(?:\\((?:SOL|DO|RE|MI|FA|LA|SI|[A-G]|[0-9]+)\\))?(?:\\/(?:SOL|DO|RE|MI|FA|LA|SI|[A-G]|[0-9]+))?';

const chordRE=new RegExp('^'+chordUnit+'$','i');

function isChord(t){
 t=norm(t).replace(/^[,;:.]+|[,;:.]+$/g,'').replace(/^\((.*)\)$/,'$1');
 if(!t)return false;
 const parts=t.replace(/^-/,'').split(/-(?=(?:SOL|DO|RE|MI|FA|LA|SI|[A-G]))/i);
 return parts.length>0&&parts.every(x=>chordRE.test(x));
}

function rowChord(t){
 const a=t.trim().split(/\s+/).filter(Boolean);
 const hits=a.filter(isChord).length;
 return hits>0&&(hits===a.length||(hits/a.length>=.65&&hits>=2));
}

function chordSpans(t){
 return(t.match(/\s+|\S+/g)||[]).map(s=>({
  text:s,chord:!/^\s+$/.test(s)&&isChord(s)
 }));
}

function makeBlocks(body){
 const lines=String(body||'').replace(/\r/g,'').split('\n');
 const out=[];
 for(let i=0;i<lines.length;i++){
  const a=lines[i];
  if(rowChord(a)&&lines[i+1]&&lines[i+1].trim()&&!rowChord(lines[i+1])){
   out.push([{text:a,chord:true},{text:lines[++i],chord:false}]);
  }else{
   out.push([{text:a,chord:rowChord(a)}]);
  }
 }
 return out;
}

function safeBreak(block,pos){
 const c=block.find(x=>x.chord)?.text||'';
 return !(pos>0&&pos<c.length&&!/\s/.test(c[pos-1])&&!/\s/.test(c[pos]));
}

function chunks(block,cols){
 const len=Math.max(...block.map(x=>x.text.length));
 if(!len)return[block];
 const res=[];
 let s=0;
 while(s<len){
  let e=Math.min(len,s+cols);
  if(e<len){
   let found=0;
   const lyric=block.find(x=>!x.chord)?.text||'';
   for(let p=e;p>=s+Math.floor(cols*.4);p--){
    if(safeBreak(block,p)&&(p>=lyric.length||p===0||/\s/.test(lyric[p-1])||/\s/.test(lyric[p]))){
     found=p;break;
    }
   }
   if(!found){
    for(let p=e;p>s;p--){
     if(safeBreak(block,p)){found=p;break;}
    }
   }
   if(!found){
    for(let p=e+1;p<=len;p++){
     if(safeBreak(block,p)){found=p;break;}
    }
   }
   if(found)e=found;
  }
  if(e<=s)e=len;
  res.push(block.map(x=>({text:x.text.slice(s,e),chord:x.chord})));
  s=e;
 }
 return res;
}

function paged(body,cols,rows){
 const result=[];
 const blocks=makeBlocks(body).flatMap(b=>chunks(b,cols));
 let page=[],n=0;
 for(const block of blocks){
  if(n&&n+block.length>rows){
   result.push(page);
   page=[];n=0;
  }
  page.push(...block);
  n+=block.length;
 }
 if(page.length||!result.length)result.push(page);
 return result;
}

function songList(){
 if(typeof cmReadonly==='undefined'||!cmReadonly||
    !Array.isArray(cmReadonly.entries)||typeof songs==='undefined')return[];
 return cmReadonly.entries.map(x=>({
  moment:x.moment||'',song:songs[x.song]
 })).filter(x=>x.song);
}

let current=null;
function cmWordPages(lines,cols,rows){
  const grupos=[];
  for(let i=0;i&lt;lines.length;i++){
    const actual=lines[i];
    const acorde=actual.red.some(v=>v===1);
    if(acorde &amp;&amp; lines[i+1] &amp;&amp;
       !lines[i+1].red.some(v=>v===1) &amp;&amp;
       lines[i+1].text.trim()){
      grupos.push([actual,lines[++i]]);
    }else{
      grupos.push([actual]);
    }
  }
  const bloques=[];
  grupos.forEach(grupo=>{
    const largo=Math.max(...grupo.map(l=>l.text.length));
    for(let desde=0;desde&lt;Math.max(1,largo);desde+=cols){
      bloques.push(grupo.map(l=>({
        text:l.text.slice(desde,desde+cols),
        red:l.red.slice(desde,desde+cols)
      })));
    }
  });
  const paginas=[];
  let pagina=[];
  bloques.forEach(bloque=>{
    if(pagina.length &amp;&amp; pagina.length+bloque.length&gt;rows){
      paginas.push(pagina);
      pagina=[];
    }
    pagina.push(...bloque);
  });
  if(pagina.length || !paginas.length)paginas.push(pagina);
  return paginas;
}
function cmWordSpans(line){
  const partes=[];
  let texto='', rojo=null;
  for(let i=0;i<line.text.length;i++){
    const esRojo=Boolean(line.red[i]);
    if(rojo!==null && esRojo!==rojo){
      partes.push({text:texto,chord:rojo});
      texto='';
    }
    rojo=esRojo;
    texto+=line.text[i];
  }
  if(texto)partes.push({text:texto,chord:rojo});
  return partes;
}
 function getPages(){
 const selected=songList()[current.song];
 const paper=document.getElementById('cm-at-page');
 if(!selected||!paper)return null;
 const cols=Math.max(12,Math.floor(
  (paper.clientWidth-16)/(current.size*.605)
 ));
 const rows=Math.max(4,Math.floor(
  (paper.clientHeight-12)/(current.size*1.4)
 ));
 const pages = selected.song.cmWordLines
  ? cmWordPages(selected.song.cmWordLines,cols,rows)
  : paged(selected.song.body,cols,rows);
return {selected,pages};
}

function draw(){
 if(!current)return;
 const d=getPages();
 if(!d)return;
 current.page=Math.min(current.page,d.pages.length-1);

 document.getElementById('cm-at-list').innerHTML=
  songList().map((s,i)=>
   '<option value="'+i+'"'+
   (i===current.song?' selected':'')+'>'+
   esc(s.song.title)+'</option>'
  ).join('');

 document.getElementById('cm-at-title').textContent=
  (d.selected.moment?d.selected.moment+' · ':'')+
  d.selected.song.title;

 const paper=document.getElementById('cm-at-page');
 paper.style.fontSize=current.size+'px';
 paper.replaceChildren();

 for(const line of d.pages[current.page]){
  const div=document.createElement('div');
  div.className='cm-at-line';
  for(const segment of (d.selected.song.cmWordLines ? cmWordSpans(line) : chordSpans(line.text))){
   const span=document.createElement('span');
   span.textContent=segment.text;
   if(d.selected.song.cmWordLines ? segment.chord : (line.chord&&segment.chord))span.className='cm-at-chord';
   div.appendChild(span);
  }
  paper.appendChild(div);
 }

 document.getElementById('cm-at-count').textContent=
  (current.page+1)+' / '+d.pages.length;
}

window.cmAtrilClose=function(){
 current=null;
 document.getElementById('cm-at-panel')?.remove();
};

window.cmAtrilOpen=function(index=0){
 const all=songList();
 if(!all.length){
  alert('Abre primero una celebración compartida.');
  return;
 }

 document.getElementById('cm-at-panel')?.remove();
 current={
  song:Math.max(0,Math.min(all.length-1,Number(index)||0)),
  page:0,size:18
 };

 const panel=document.createElement('section');
 panel.id='cm-at-panel';
 panel.innerHTML=
  '<header>'+
  '<button id="cm-at-close">✕ Salir</button>'+
  '<select id="cm-at-list" aria-label="Elegir canción"></select>'+
  '<button id="cm-at-smaller">A−</button>'+
  '<button id="cm-at-bigger">A+</button>'+
  '</header>'+
  '<strong id="cm-at-title"></strong>'+
  '<main id="cm-at-page"></main>'+
  '<footer>'+
  '<button id="cm-at-prev">← Anterior</button>'+
  '<span id="cm-at-count"></span>'+
  '<button id="cm-at-next">Siguiente →</button>'+
  '</footer>';

 document.body.appendChild(panel);

 document.getElementById('cm-at-close').onclick=window.cmAtrilClose;

 document.getElementById('cm-at-list').onchange=e=>{
  current.song=Number(e.target.value);
  current.page=0;draw();
 };

 document.getElementById('cm-at-smaller').onclick=()=>{
  current.size=Math.max(12,current.size-2);
  current.page=0;draw();
 };

 document.getElementById('cm-at-bigger').onclick=()=>{
  current.size=Math.min(28,current.size+2);
  current.page=0;draw();
 };

 document.getElementById('cm-at-next').onclick=()=>{
  const d=getPages();
  if(current.page<d.pages.length-1)current.page++;
  else if(current.song<songList().length-1){
   current.song++;current.page=0;
  }
  draw();
 };

 document.getElementById('cm-at-prev').onclick=()=>{
  if(current.page>0)current.page--;
  else if(current.song>0){
   current.song--;
   current.page=0;
   draw();
   current.page=getPages().pages.length-1;
  }
  draw();
 };

 draw();
};

const css=document.createElement('style');
css.id='cm-at-style-v8';
css.textContent=`
#cm-at-panel{
 position:fixed;inset:0;z-index:2147483600;
 background:#fffaf0;color:#252525;
 display:flex;flex-direction:column;
 box-sizing:border-box;
 padding:env(safe-area-inset-top) 10px env(safe-area-inset-bottom);
 font-family:system-ui,sans-serif
}
#cm-at-panel *{box-sizing:border-box}
#cm-at-panel header,#cm-at-panel footer{
 display:flex;align-items:center;gap:6px;
 padding:8px 0;flex-shrink:0
}
#cm-at-panel button,#cm-at-panel select{
 background:white;border:1px solid #d9aca9;
 border-radius:8px;color:#88242d;
 padding:9px 6px;font-size:13px
}
#cm-at-panel select{flex:1;min-width:0}
#cm-at-title{text-align:center;font-size:13px}
#cm-at-page{
 flex:1;min-height:0;overflow:hidden;padding:12px 8px;
 font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
 line-height:1.4
}
#cm-at-page .cm-at-line{
 white-space:pre;min-height:1.4em
}
#cm-at-page .cm-at-chord{
 color:#b9212b;font-weight:700
}
#cm-at-panel footer button{flex:1}
#cm-at-count{white-space:nowrap;font-size:12px}
`;
document.head.appendChild(css);

function addButton(){
 if(typeof cmReadonly==='undefined'||!cmReadonly)return;
 const actions=document.querySelector('.cm-read + .cm-actions');
 if(!actions||document.getElementById('cm-at-button'))return;
 const b=document.createElement('button');
 b.id='cm-at-button';
 b.type='button';
 b.textContent='🎸 Modo atril';
 b.onclick=()=>window.cmAtrilOpen(0);
 actions.appendChild(b);
}

if(typeof cmRenderRead==='function'){
 const original=cmRenderRead;
 cmRenderRead=function(){
  original();
  addButton();
 };
}

addButton();
window.addEventListener('resize',()=>{if(current)draw();});
})();
