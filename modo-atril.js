
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
  function hasChord(line){
    return line.red.some(v=>v===1) && line.text.trim().length>0;
  }
  function canSplit(group,pos){
    for(const line of group){
      if(hasChord(line) && pos>0 && pos<line.text.length &&
         line.red[pos-1] && line.red[pos] &&
         line.text[pos-1]!=' ' && line.text[pos]!=' ') return false;
    }
    return true;
  }
  function splitGroup(group){
    const len=Math.max(...group.map(line=>line.text.length));
    if(len<=cols) return [group];
    const result=[];
    let start=0;
    while(start<len){
      let end=Math.min(len,start+cols);
      if(end<len){
        const lyric=group.find(line=>!hasChord(line));
        let best=0;
        for(let i=end;i>start+Math.floor(cols*.45);i--){
          if(!canSplit(group,i)) continue;
          if(!lyric || i>=lyric.text.length ||
             /\s/.test(lyric.text[i]||'') ||
             /\s/.test(lyric.text[i-1]||'')){
            best=i;
            break;
          }
        }
        if(!best){
          for(let i=end;i>start;i--){
            if(canSplit(group,i)){best=i;break;}
          }
        }
        if(!best){
          for(let i=end+1;i<=len;i++){
            if(canSplit(group,i)){best=i;break;}
          }
        }
        if(best) end=best;
      }
      if(end<=start) end=len;
      result.push(group.map(line=>({
        text:line.text.slice(start,end),
        red:line.red.slice(start,end)
      })));
      start=end;
    }
    return result;
  }
  const groups=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(hasChord(line) && lines[i+1] &&
       !hasChord(lines[i+1]) && lines[i+1].text.trim()){
      groups.push([line,lines[++i]]);
    }else{
      groups.push([line]);
    }
  }
  const blocks=groups.flatMap(splitGroup);
  const pages=[];
  let page=[];
  for(const block of blocks){
    if(page.length && page.length+block.length>rows){
      pages.push(page);
      page=[];
    }
    page.push(...block);
  }
  if(page.length || !pages.length) pages.push(page);
  return pages;
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
/* Abrir directamente la canción en el atril corregido */
(function () {
  'use strict';

  const anterior = render;
  let panel = null, elegida = -1, desplazamiento = '';

  function cerrar() {
    if (!panel) return;
    panel.remove();
    panel = null;
    elegida = -1;
    document.body.style.overflow = desplazamiento;
  }

  function preparar(canto) {
    const unidad = '(?:SOL|DO|RE|MI|FA|LA|SI|[A-G])(?:#|b)?(?:maj|min|sus|dim|aug|add|m|M|º|°|\\+)?(?:-?[0-9]+)?(?:\\((?:SOL|DO|RE|MI|FA|LA|SI|[A-G]|[0-9]+)\\))?(?:\\/(?:SOL|DO|RE|MI|FA|LA|SI|[A-G]|[0-9]+))?';
    const acorde = new RegExp('^' + unidad + '$', 'i');

    return String(canto.body || '')
      .replace(/\r/g, '')
      .split('\n')
      .map(text => {
        const trozos = text.trim().split(/\s+/).filter(Boolean);
        const rojo = trozos.length > 0 && trozos.every(t =>
          t.replace(/[‐-‒–—−]/g, '-')
            .replace(/^[,;:.]+|[,;:.]+$/g, '')
            .replace(/^\((.*)\)$/, '$1')
            .replace(/^-/, '')
            .split(/-(?=(?:SOL|DO|RE|MI|FA|LA|SI|[A-G]))/i)
            .every(p => acorde.test(p))
        );
        return {
          text,
          red: Array(text.length).fill(rojo ? 1 : 0)
        };
      });
  }

  function iniciar(datos, corregir) {
  const estilo = document.createElement('style');
  estilo.textContent = 'header,.note{display:none!important}';
  document.head.appendChild(estilo);

  songs.splice(0, songs.length, datos);
  idx = 0;
  page = 0;
  if (!corregir) correctedLines = lines => lines;

  const posicionesOriginales = correctedLines;
  let cambio = 0;

  const notas = [
    'DO','DO#','RE','RE#','MI','FA',
    'FA#','SOL','SOL#','LA','LA#','SI'
  ];
  const ingles = [
    'C','C#','D','D#','E','F',
    'F#','G','G#','A','A#','B'
  ];
  const alturas = {
    DO:0, RE:2, MI:4, FA:5, SOL:7, LA:9, SI:11,
    C:0, D:2, E:4, F:5, G:7, A:9, B:11
  };

  function acorde(texto) {
    return texto.split(/([/‐‒–—−-])/).map(parte => {
      const m = parte.match(
        /^(\(?)(SOL|DO|RE|MI|FA|LA|SI|[A-G])([#♯b♭]?)(.*)$/i
      );
      if (!m) return parte;

      const sufijo = m[4];
      if (!/^(?:(?:maj|min|sus|dim|aug|add|m|M)?\d*(?:[#b+]\d+)?(?:\(\d+(?:[,/#b+]\d+)*\))?|[º°+])\)?$/i.test(sufijo)) {
        return parte;
      }

      const raiz = m[2].toUpperCase();
      const alteracion = /[#♯]/.test(m[3])
        ? 1 : /[b♭]/.test(m[3]) ? -1 : 0;
      const numero =
        ((alturas[raiz] + alteracion + cambio) % 12 + 12) % 12;

      let nueva = (raiz.length === 1 ? ingles : notas)[numero];

      if (m[2] === m[2].toLowerCase()) {
        nueva = nueva.toLowerCase();
      } else if (
        m[2].length > 1 &&
        m[2].slice(1) === m[2].slice(1).toLowerCase()
      ) {
        nueva = nueva[0] + nueva.slice(1).toLowerCase();
      }

      return m[1] + nueva + sufijo;
    }).join('');
  }

  function transportar(linea) {
    if (!cambio || !linea.red.some(Boolean)) return linea;

    const caracteres = [], colores = [];
    let finalAnterior = -1;

    for (const m of linea.text.matchAll(/\S+/g)) {
      const rojo = linea.red
        .slice(m.index, m.index + m[0].length)
        .every(Boolean);

      const texto = rojo ? acorde(m[0]) : m[0];
      const posicion = Math.max(m.index, finalAnterior + 1);

      while (caracteres.length < posicion) {
        caracteres.push(' ');
        colores.push(0);
      }

      for (let j = 0; j < texto.length; j++) {
        caracteres[posicion + j] = texto[j];
        colores[posicion + j] =
          rojo ? 1 : (linea.red[m.index + j] || 0);
      }

      finalAnterior = posicion + texto.length;
    }

    return {text: caracteres.join(''), red: colores};
  }

  correctedLines = lines =>
    posicionesOriginales(lines).map(transportar);

  document.body.classList.add('atril-on');
  document.getElementById('prev').textContent = '← Página anterior';
  document.getElementById('next').textContent = 'Página siguiente →';

  const controles = document.createElement('div');
  controles.style.cssText =
    'display:flex;justify-content:center;align-items:center;' +
    'gap:8px;flex-wrap:wrap;padding:6px;flex-shrink:0';

  const estado = document.createElement('span');
  estado.style.fontSize = '13px';

  function actualizarTono(valor) {
    cambio = valor;
    page = 0;
    estado.textContent = cambio === 0
      ? 'Tono original'
      : (cambio > 0 ? '+' : '') + cambio + ' semitonos';
    render();
  }

  for (const [nombre, accion] of [
    ['−½ tono', () => actualizarTono(cambio - 1)],
    ['Original', () => actualizarTono(0)],
    ['+½ tono', () => actualizarTono(cambio + 1)]
  ]) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = nombre;
    boton.onclick = accion;
    controles.appendChild(boton);
  }

  controles.appendChild(estado);
  const papel = document.getElementById('paper');
  papel.parentNode.insertBefore(controles, papel);
  actualizarTono(0);
}
  function actualizar() {
    document.getElementById('cm-directo-volver').textContent =
      '← Volver';

    document.getElementById('cm-directo-favorito').textContent =
      favs.includes(current) ? '♥ Favorita' : '♡ Favorito';

    document.getElementById('cm-directo-celebracion').textContent =
      cmGet().entries.some(x => x.song === current)
        ? '✓ En celebración'
        : '+ Celebración';
  }

  function abrir() {
    const canto = songs[current];

    if (!canto || !canto.body || canto.cmPdf) {
      cerrar();
      return;
    }

    if (panel && elegida === current) {
      actualizar();
      return;
    }

    cerrar();
    elegida = current;
    desplazamiento = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panel = document.createElement('section');
    panel.id = 'cm-atril-directo';
    panel.style.cssText =
      'position:fixed;inset:0;z-index:2147483600;' +
      'background:#fff;display:flex;flex-direction:column;' +
      'padding-top:env(safe-area-inset-top);' +
      'padding-bottom:env(safe-area-inset-bottom)';

    const barra = document.createElement('div');
    barra.style.cssText =
      'display:flex;flex-wrap:wrap;gap:6px;padding:8px;flex-shrink:0';

    for (const [id, accion] of [
      ['cm-directo-volver', () => {
        current = -1;
        render();
      }],
      ['cm-directo-favorito', () => toggle(current, 'fav')],
      ['cm-directo-celebracion', () => toggle(current, 'cel')]
    ]) {
      const boton = document.createElement('button');
      boton.id = id;
      boton.className = 'action';
      boton.onclick = accion;
      barra.appendChild(boton);
    }

    const marco = document.createElement('iframe');
    marco.title = 'Atril de ' + canto.title;
    marco.style.cssText =
      'display:block;width:100%;flex:1;min-height:0;border:0';

    const datos = {
      title: canto.title,
      number: 1,
      lines: canto.cmWordLines || preparar(canto)
    };

    marco.onload = () => {
      if (!marco.isConnected) return;

      try {
        const doc = marco.contentDocument;
        const script = doc.createElement('script');

        script.textContent =
          '(' + iniciar.toString() + ')(' +
          JSON.stringify(datos) + ',' +
          Boolean(canto.cmWordLines) + ');';

        doc.body.appendChild(script);
      } catch (error) {
        cerrar();
        alert(
          'No se pudo abrir el atril. ' +
          'La canción sigue disponible en su vista habitual.'
        );
      }
    };

    marco.src = 'Claret_Music_413_Atril_POSICIONES_CORREGIDAS.html';

    panel.append(barra, marco);
    document.body.appendChild(panel);
    actualizar();
  }

  render = function () {
    anterior();
    if (current >= 0) abrir();
    else cerrar();
  };

  if (current >= 0) abrir();
})();
/* Corregir los resultados PDF del buscador */
(function () {
  const retirado = 'Cancionero_Espiritu_Santo_Claret_Music_OK.pdf';
  const listarAntes = renderList;
  const abrirAntes = openSong;

  renderList = function () {
    listarAntes();

    const lista = document.getElementById('list');
    if (!lista) return;

    lista.querySelectorAll('.song').forEach(fila => {
      const boton = fila.querySelector('.open');
      const coincidencia = boton?.getAttribute('onclick')
        ?.match(/openSong\((\d+)\)/);

      if (!coincidencia) return;

      const canto = songs[Number(coincidencia[1])];
      if (!canto?.cmPdf) return;

      if (canto.cmPdf.file === retirado) {
        fila.remove();
        return;
      }

      const detalle = fila.querySelector('.muted');
      if (detalle) {
        detalle.textContent =
          'Abrir PDF · Página ' + canto.cmPdf.page;
      }
    });

    if (!lista.children.length) {
      lista.textContent = 'No hay canciones en esta sección.';
    }
  };

  openSong = function (i) {
    const canto = songs[i];

    if (canto?.cmPdf) {
      cmOpenPdf(canto.cmPdf.file, canto.cmPdf.page, canto.title);
      return;
    }

    abrirAntes(i);
  };
})();
/* Ordenar resultados e identificar el Cancionero Claretiano */
(function () {
  const listarAntes = renderList;

  renderList = function () {
    listarAntes();

    const lista = document.getElementById('list');
    if (!lista) return;

    const filas = [...lista.querySelectorAll('.song')];

    function obtenerCanto(fila) {
      const boton = fila.querySelector('.open');
      const numero = boton?.getAttribute('onclick')
        ?.match(/openSong\((\d+)\)/);

      return numero ? songs[Number(numero[1])] : null;
    }

    function orden(fila) {
      const canto = obtenerCanto(fila);
      if (!canto) return 9;
      if (canto.cmWord) return 1;
      if (!canto.cmPdf) return 0;
      if (/hakuna/i.test(canto.title)) return 2;
      return 3;
    }

    filas.forEach(fila => {
      const canto = obtenerCanto(fila);
      if (!canto || canto.cmWord || canto.cmPdf) return;

      const boton = fila.querySelector('.open');
      const detalle = boton.querySelector('.muted');

      boton.replaceChildren(
        document.createTextNode(
          canto.title + ' · Cancionero Claretiano'
        )
      );

      if (detalle) boton.appendChild(detalle);
    });

    filas.sort((a, b) => orden(a) - orden(b));
    filas.forEach(fila => lista.appendChild(fila));
  };
})();
/* Ocultar el tipo de archivo en los resultados */
(function () {
  const listarAntes = renderList;

  renderList = function () {
    listarAntes();

    document.querySelectorAll('#list .song .open').forEach(boton => {
      boton.childNodes.forEach(nodo => {
        if (nodo.nodeType === 3) {
          nodo.textContent = nodo.textContent.replace(
            /\s*\((PDF|Word)\)/gi, ''
          );
        }
      });

      const detalle = boton.querySelector('.muted');
      if (detalle) {
        detalle.textContent = detalle.textContent.replace(
          'Abrir PDF', 'Ver canción'
        );
      }
    });
  };
})();
/* Retirar Espíritu Santo PDF de la búsqueda de Celebración */
cmUpdateSearch = function () {
  const lista = document.getElementById('cm-results');
  if (!lista) return;

  const normalizar = texto => String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const resultados = songs
    .map((canto, indice) => ({ canto, indice }))
    .filter(({ canto }) =>
      canto.cmPdf?.file !==
      'Cancionero_Espiritu_Santo_Claret_Music_OK.pdf'
    )
    .filter(({ canto }) =>
      normalizar(canto.title).includes(normalizar(cmFilter))
    )
    .slice(0, cmFilter ? 40 : 10);

  lista.innerHTML = resultados.map(({ canto, indice }) => {
    const titulo = canto.title.replace(/\s*\((PDF|Word)\)/gi, '');
    return '<div class="cm-item"><strong>' +
      cmEscape(titulo) +
      '</strong><div class="cm-actions"><button onclick="cmAdd(' +
      indice + ')">+ Añadir</button></div></div>';
  }).join('') || '<p>No se encontraron canciones.</p>';
};
