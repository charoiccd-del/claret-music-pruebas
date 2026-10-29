
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
  if (!corregir || datos.cmPrealigned) correctedLines = lines => lines;

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
 window.cmIniciarAtril = iniciar;
window.cmPrepararAtril = preparar;
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
      cmPrealigned: Boolean(canto.cmPrealigned),
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
/* Usar el atril corregido también en Celebración */
(function () {
  let panel = null;

  window.cmAtrilClose = function () {
    if (panel) panel.remove();
    panel = null;
    document.getElementById('cm-at-panel')?.remove();
  };

  window.cmAtrilOpen = function (indice = 0) {
    const entradas = (cmReadonly?.entries || [])
      .filter(entrada => songs[entrada.song]);

    if (!entradas.length) return;

    cmAtrilClose();

    panel = document.createElement('section');
    panel.style.cssText =
      'position:fixed;inset:0;z-index:2147483600;' +
      'background:white;display:flex;flex-direction:column;' +
      'padding-top:env(safe-area-inset-top);' +
      'padding-bottom:env(safe-area-inset-bottom)';

    const barra = document.createElement('div');
    barra.style.cssText =
      'display:flex;gap:6px;padding:8px;align-items:center;flex-wrap:wrap';

    const salir = document.createElement('button');
    salir.textContent = '✕ Salir';
    salir.className = 'action';
    salir.onclick = cmAtrilClose;

    const selector = document.createElement('select');
    selector.style.cssText =
      'flex:1;min-width:0;padding:10px;font-size:16px';

    entradas.forEach((entrada, i) => {
      const opcion = document.createElement('option');
      opcion.value = i;
      opcion.textContent = entrada.moment + ' · ' +
        songs[entrada.song].title.replace(/\s*\((PDF|Word)\)/gi, '');
      selector.appendChild(opcion);
    });

    const contenido = document.createElement('div');
    contenido.style.cssText =
      'display:flex;flex:1;min-height:0;flex-direction:column';

    const anteriorCanto = document.createElement('button');
    const siguienteCanto = document.createElement('button');
    anteriorCanto.textContent = '← Anterior';
    siguienteCanto.textContent = 'Siguiente →';
    anteriorCanto.className = siguienteCanto.className = 'action';
    const pie = document.createElement('footer');
    pie.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px;flex-shrink:0';
    anteriorCanto.style.flex = siguienteCanto.style.flex = '1';
    const contador = document.createElement('span');
    contador.style.cssText = 'font-size:12px;text-align:center';
    pie.append(anteriorCanto, contador, siguienteCanto);
    let pasarPagina = null, entrarAlFinal = false;
    function cambiarCanto(paso) {
      const destino = Number(selector.value) + paso;
      if (destino < 0 || destino >= entradas.length) return;
      entrarAlFinal = paso < 0;
      selector.value = destino;
      cargar();
    }
    anteriorCanto.onclick = () => { if (pasarPagina) pasarPagina(-1); };
    siguienteCanto.onclick = () => { if (pasarPagina) pasarPagina(1); };

    function cargar() {
      pasarPagina = null;
      anteriorCanto.disabled = siguienteCanto.disabled = true;
      contador.textContent = 'Cargando…';
      const canto = songs[entradas[Number(selector.value)].song];
      contenido.replaceChildren();

      if (canto.cmPdf) {
        entrarAlFinal = false;
        pasarPagina = cambiarCanto;
        anteriorCanto.disabled = Number(selector.value) === 0;
        siguienteCanto.disabled = Number(selector.value) === entradas.length - 1;
        contador.textContent = 'Canto ' + (Number(selector.value) + 1) + ' / ' + entradas.length;
        const boton = document.createElement('button');
        boton.className = 'action';
        boton.textContent = 'Abrir canción';
        boton.onclick = () => cmOpenPdf(
          canto.cmPdf.file, canto.cmPdf.page, canto.title
        );
        contenido.appendChild(boton);
        return;
      }

      const marco = document.createElement('iframe');
      marco.title = 'Atril de ' + canto.title;
      marco.style.cssText =
        'width:100%;flex:1;min-height:0;border:0';

      marco.onload = function () {
        if (!marco.isConnected) return;
        const doc = marco.contentDocument;
        const script = doc.createElement('script');
        const datos = {
          title: canto.title,
          number: 1,
          cmPrealigned: Boolean(canto.cmPrealigned),
          lines: canto.cmWordLines || cmPrepararAtril(canto)
        };

        script.textContent =
          '(' + cmIniciarAtril.toString() + ')(' +
          JSON.stringify(datos) + ',' +
          Boolean(canto.cmWordLines) + ');';

        doc.body.appendChild(script);
        const enlazar = doc.createElement('script');
        const ocultarPie = doc.createElement('style');
        ocultarPie.textContent = 'footer{display:none!important}';
        doc.head.appendChild(ocultarPie);
        marco.contentWindow.cmOtroCanto = cambiarCanto;
        marco.contentWindow.cmEntrarAlFinal = entrarAlFinal;
        entrarAlFinal = false;
        marco.contentWindow.cmActualizarPaso = function (pagina, total) {
          anteriorCanto.disabled = Number(selector.value) === 0 && pagina === 0;
          siguienteCanto.disabled = Number(selector.value) === entradas.length - 1 && pagina >= total - 1;
          contador.textContent = 'Canto ' + (Number(selector.value) + 1) + ' / ' + entradas.length +
            ' · Página ' + (pagina + 1) + ' / ' + total;
        };
        enlazar.textContent = `
          (function () {
            const dibujar = render;
            render = function () {
              dibujar();
              window.cmActualizarPaso(page, lastCount);
            };
            window.cmPasarPagina = function (paso) {
              if (paso > 0) {
                if (page < lastCount - 1) { page++; render(); }
                else window.cmOtroCanto(1);
              } else {
                if (page > 0) { page--; render(); }
                else window.cmOtroCanto(-1);
              }
            };
            render();
            if (window.cmEntrarAlFinal) { page = lastCount - 1; render(); }
          })();`;
        doc.body.appendChild(enlazar);
        pasarPagina = paso => marco.contentWindow.cmPasarPagina(paso);
      };

      marco.src =
        'Claret_Music_413_Atril_POSICIONES_CORREGIDAS.html';
      contenido.appendChild(marco);
    }

    selector.value = Math.max(
      0, Math.min(entradas.length - 1, Number(indice) || 0)
    );
    selector.onchange = () => { entrarAlFinal = false; cargar(); };

    barra.append(salir, selector);
    panel.append(barra, contenido, pie);
    document.body.appendChild(panel);
    cargar();
  };
})();
/* Buscar seguido sin perder el cursor */
searchNow = function (texto) {
  const campo = main.querySelector('input.search');
  if (!campo) return;

  mode = 'songs';
  current = -1;
  query = texto;

  if (!main.querySelector('#list')) {
    [...main.children].forEach(elemento => {
      if (elemento !== campo) elemento.remove();
    });

    const titulo = document.createElement('h2');
    titulo.textContent = 'Canciones';
    campo.before(titulo);

    const lista = document.createElement('div');
    lista.id = 'list';
    campo.after(lista);

    document.querySelectorAll('.nav button').forEach(boton =>
      boton.classList.remove('active')
    );
    document.getElementById('n-songs')?.classList.add('active');
  }

  renderList();
};
/* Mostrar también los cancioneros con letras y acordes */
cmLibraryRender = function () {
  document.querySelectorAll('.nav button').forEach(b =>
    b.classList.remove('active')
  );

  main.innerHTML = `
    <button class="back" onclick="show('home')">← Inicio</button>
    <h2>Cancioneros</h2>
    <p class="hint">Elige un cancionero o busca una canción.</p>
    <input id="cm-lib-query" class="search"
      placeholder="Buscar canción…" aria-label="Buscar canción">
    <select id="cm-lib-book" class="search"
      aria-label="Elegir cancionero"></select>
    <p id="cm-lib-count" class="hint"></p>
    <div id="cm-lib-results"></div>
  `;

  const selector = document.getElementById('cm-lib-book');
  const opciones = [
    ['all', 'Todos los cancioneros'],
    ['claretiano', 'Cancionero Claretiano'],
    ['espiritu', 'Espíritu Santo'],
    ['adviento2026', 'Adviento 2026 - P.Espíritu Santo'],
    ...cmLibraryBooks.map((libro, i) => [String(i), libro.name])
  ];

  opciones.forEach(([valor, nombre]) => {
    const opcion = document.createElement('option');
    opcion.value = valor;
    opcion.textContent = nombre;
    selector.appendChild(opcion);
  });

  if (!opciones.some(([valor]) => valor === String(cmLibraryFilter))) {
    cmLibraryFilter = 'all';
  }

  selector.value = cmLibraryFilter;
  const campo = document.getElementById('cm-lib-query');
  campo.value = cmLibraryQuery;

  campo.oninput = () => {
    cmLibraryQuery = campo.value;
    cmLibraryResults();
  };

  selector.onchange = () => {
    cmLibraryFilter = selector.value;
    cmLibraryResults();
  };

  cmLibraryResults();
  window.scrollTo(0, 0);
};

cmLibraryResults = function () {
  const resultados = [];
  const filtro = String(cmLibraryFilter);
  const consulta = cmLibraryNorm(cmLibraryQuery);

  songs.forEach((canto, indice) => {
    if (canto.cmPdf) return;

    const grupo = canto.cmBook || (canto.cmWord ? 'espiritu' : 'claretiano');
    if (filtro !== 'all' && filtro !== grupo) return;
    if (!cmLibraryNorm(canto.title).includes(consulta)) return;

    resultados.push({
      titulo: canto.title.replace(/\s*\((PDF|Word)\)/gi, ''),
      detalle: canto.cmBookName || (canto.cmWord
        ? 'Espíritu Santo'
        : 'Cancionero Claretiano'),
      orden: canto.cmBook ? 1.5 : canto.cmWord ? 1 : 0,
      abrir: () => openSong(indice)
    });
  });

  cmLibraryBooks.forEach((libro, i) => {
    if (libro.file === 'Cancionero_Espiritu_Santo_Claret_Music_OK.pdf') {
      return;
    }
    if (filtro !== 'all' && filtro !== String(i)) return;

    libro.songs.forEach(canto => {
      if (!cmLibraryNorm(canto.title).includes(consulta)) return;

      resultados.push({
        titulo: canto.title,
        detalle: libro.name + ' · Página ' + canto.page,
        orden: /hakuna/i.test(libro.name) ? 2 : 3,
        abrir: () => cmOpenPdf(libro.file, canto.page, canto.title)
      });
    });
  });

  resultados.sort((a, b) => a.orden - b.orden);

  document.getElementById('cm-lib-count').textContent =
    resultados.length + ' canciones encontradas' +
    (resultados.length > 250 ? ' · Mostrando las primeras 250' : '');

  const lista = document.getElementById('cm-lib-results');
  lista.replaceChildren();

  resultados.slice(0, 250).forEach(resultado => {
    const fila = document.createElement('div');
    fila.className = 'song';

    const boton = document.createElement('button');
    boton.className = 'open';
    boton.textContent = resultado.titulo;
    boton.onclick = resultado.abrir;

    const detalle = document.createElement('div');
    detalle.className = 'muted';
    detalle.textContent = resultado.detalle;

    boton.appendChild(detalle);
    fila.appendChild(boton);
    lista.appendChild(fila);
  });
};


/* Cancionero Adviento 2026 - P.Espíritu Santo */
(function () {
  const nombre = 'Adviento 2026 - P.Espíritu Santo';
  const cantos = [{"title":"VIVA LA FE, VIVA LA ESPERANZA, VIVA EL AMOR","number":1,"lines":[{"text":"LA                                  MI","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Viva la fe, viva la esperanza, viva el amor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"  LA","red":[0,0,1,1]},{"text":"","red":[]},{"text":"Viva la fe, viva la esperanza, viva el amor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                                    RE","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Viva la fe, viva la esperanza, viva el amor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"          LA             MI            LA","red":[0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Que viva Cristo, que viva Cristo, que viva Él.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"          MI                       LA","red":[0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Que viva Cristo, que viva, que viva Cristo, que viva,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"          MI            LA","red":[0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"que viva Cristo, que viva Él (bis).","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"ALELUYA DE L A TIERRA","number":2,"lines":[{"text":"(Brotes de Olivo)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"MI              LA            SI7           MI","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"¿Quién quiere resucitar, a este mundo que se muere?.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"  LA              MI           SI7                MI","red":[0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"¿Quién cantará el aleluya de esa nueva luz que viene?.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                      LA                  sol#","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1]},{"text":"Quién cuando mire la tierra y las tragedias observe,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"               do#                       SI7","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"sentirá en su corazón el dolor de quien se muere.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                                    do#    LA","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1]},{"text":"¿Quién es capaz de salvar a este mundo decadente?","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"               SI7                               MI","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Y mantiene la esperanza de los muchos que la pierden.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"        LA    SI7         MI     SI7           MI","red":[0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"El que sufre, mata y muere, desespera y enloquece","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         LA  SI7   MI        SI7   MI","red":[0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,1,1]},{"text":"y otros son espectadores, no lo sienten.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"MI   LA   SI7  MI          SI7        MI","red":[1,1,0,0,0,1,1,0,0,0,1,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1,1]},{"text":"Aleluya cantará, quien perdió la esperanza","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"        LA     SI7  MI     SI7   MI","red":[0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0,1,1]},{"text":"Y la tierra sonreirá, aleluya (bis).","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"SABER QUE VENDRÁS","number":3,"lines":[{"text":"LA          RE                     LA         fa#    LA                   RE              MI","red":[1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"En este mundo que Cristo nos da, hacemos la ofrenda del pan.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"LA         RE        LA           fa#  LA             si     MI","red":[1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1]},{"text":"El pan de nuestro trabajo sin fin y el vino de nuestro cantar.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"LA      RE                LA      fa#       LA            RE     MI","red":[1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1]},{"text":"Traigo ante Ti nuestra justa inquietud: amar la justicia y la paz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"RE          MI       LA          fa#","red":[1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Saber que vendrás, saber que estarás","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" si                MI        LA7","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1]},{"text":"partiendo a los pobres tu pan.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"SANTO (PORTUGUÉS)","number":4,"lines":[{"text":"Intro: fa – MI – RE – LA","red":[0,0,0,0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1]},{"text":"","red":[]},{"text":"LA           MI             si         RE   MI","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1]},{"text":"Santo, Santo, Santo el Señor, Dios del universo.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"LA                    MI                 RE","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"El cielo y la tierra proclaman tu inmensa Gloria. (Bis)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"fa      MI            RE","red":[1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Hosanna en las alturas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"LA               MI","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Bendito aquel que viene","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     Si        RE","red":[0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1]},{"text":"en nombre del Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"  LA      MI            RE            (FA)","red":[0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1]},{"text":"Hosanna, hosanna, en las alturas (bis).","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SI           FA            do        MI   FA","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1]},{"text":"Santo, Santo, Santo el Señor, Dios del universo.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SI                  FA                  MI","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"El cielo y la tierra proclaman tu inmensa Gloria. (Bis)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"Sol     FA       SI","red":[1,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1]},{"text":"Hosanna en las alturas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"EL SEÑOR ES MI LUZ Y MI SALVACIÓN","number":5,"lines":[{"text":"(Hermana Glenda)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"RE               SOL","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"El Señor es mi luz y mi salvación.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"mi             LA7             (RE)","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1]},{"text":"Yo no camino en tinieblas. (Bis)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"     RE                   si","red":[0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"1.- El Señor es mi luz y mi salvación.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"si (sin dedo inferior)","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"¿A quién temeré?.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"mi                     SOL","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"El Señor es la defensa de mi vida.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"LA7","red":[1,1,1]},{"text":"¿Quién me hará temblar?.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"      RE","red":[0,0,0,0,0,0,1,1]},{"text":"2.- Espero gozar de la dicha del Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"si                   mi","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"En el país de la vida, espera en el Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SOL            LA7","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Se valiente. En ánimo espera en el Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"El Señor es mi luz y mi salvación....","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Yo no camino en tinieblas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"SANTA MARÍA DE LA ESPERANZA","number":6,"lines":[{"text":"la DO  SOL  la  FA SOL     DO","red":[1,1,0,1,1,0,0,1,1,1,0,0,1,1,0,0,1,1,0,1,1,1,0,0,0,0,0,1,1]},{"text":"San-ta Ma-ría, de la Esperanza","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    la      re                 la","red":[0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"mantén el ritmo de nuestra espera (bis solo esta línea).","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     la        FA                la","red":[0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Nos distes al esperado de los tiempos,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    SOL        FA                la","red":[0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"mil veces prometido en los profetas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    re                  la","red":[0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Y nosotros de nuevo deseamos","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SOL                              la","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"que vuelva a repetirnos sus promesas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"PREPARAD EL CAMINO AL SEÑOR","number":7,"lines":[{"text":"MI   fa#     sol#       SI7","red":[1,1,0,0,0,1,1,1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1]},{"text":"Preparad el camino al Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"MI   fa#       sol# SI7  MI","red":[1,1,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,1,1,1,0,0,1,1]},{"text":"Y escuchad la Palabra de Dios.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"  MI                 fa#","red":[0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Voz que clama en el desierto:","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     sol#                 SI7","red":[0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"“preparad el camino al Señor”,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     MI                 fa#          sol#       SI7     MI","red":[0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1,1]},{"text":"haced rectas todas sus sendas y escuchad la Palabra de Di","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"CERCA DE DIOS (Aleluya)","number":8,"lines":[{"text":"SI                       MI","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Los que tienen y nunca se olvidan","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                 SI","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"que a otros les falta; los que nunca","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"            MI    DO7       FA","red":[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1]},{"text":"usaron la fuerza, sino la razón.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     SI               SI7                MI       SI","red":[0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1]},{"text":"Los que dan una mano y ayudan a los que han caído: esa gente es feliz","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       FA               SI","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"porque vive muy cerca de Dios.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"  FA        SI SI7            MI","red":[0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Aleluya, aleluya, por esa gente","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                 FA               SI","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"que vive y que siente en su vida el amor (bis).","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"ESTO QUE SOY, ESO TE DOY (Ofertorio)","number":9,"lines":[{"text":"LA","red":[1,1]},{"text":"A veces me pregunto ¿porqué yo?,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" fa#","red":[0,1,1,1]},{"text":"y sólo me respondes porque quiero.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" RE                  si","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Es un misterio grande que nos llames,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE               LA","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"así tal como somos a tu encuentro.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"LA","red":[1,1]},{"text":"Entonces redescubro una verdad,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"fa#","red":[1,1,1]},{"text":"mi vida, nuestra vida es un tesoro.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE                    si","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Se trata entonces sólo de ofrecerte,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" RE               LA","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"con todo nuestro amor, esto que somos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"    MI     fa#","red":[0,0,0,0,1,1,0,0,0,0,0,1,1,1]},{"text":"¿QUÉ TE DARE, QUE TE DAREMOS?,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     RE      LA","red":[0,0,0,0,0,1,1,0,0,0,0,0,0,1,1]},{"text":"SI TODO, TODO ES TU REGALO.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     MI   fa#","red":[0,0,0,0,0,1,1,0,0,0,1,1,1]},{"text":"TE OFRECERE, TE OFRECEREMOS,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    do#      RE   MI     LA","red":[0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0,1,1]},{"text":"ESTO QUE SOMOS... ESTO QUE SOY,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"ESO TE DOY.","red":[0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"LA","red":[1,1]},{"text":"Esto que soy, esto es lo que te doy,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"fa#","red":[1,1,1]},{"text":"esto que somos, es lo que te damos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE.                 si","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Tu no desprecias nuestra vida humilde,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" RE.               LA","red":[0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"se trata de poner todo en tus manos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"LA","red":[1,1]},{"text":"Esto que soy, esto es lo que te doy,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"fa#","red":[1,1,1]},{"text":"esto que somos, es lo que te damos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE.                 si","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Tu no desprecias nuestra vida humilde,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" RE.               LA","red":[0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"se trata de poner todo en tus manos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"LA","red":[1,1]},{"text":"Aquí van mis trabajos y mi fe,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"fa#","red":[1,1,1]},{"text":"mis mates, mis bajones y mis sueños.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE.                si","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Y todas las personas que me diste,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE.            LA","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"desde mi corazón te las ofrezco.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Estribillo","red":[0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"LA","red":[1,1]},{"text":"Vi tanta gente un domingo de sol,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"fa#","red":[1,1,1]},{"text":"me conmovió el latir de tantas vidas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE.             si","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Y adiviné tu abrazo gigantesco,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" RE                LA","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"y sé que sus historias recibías.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"LA","red":[1,1]},{"text":"Por eso tu altar luce vino y pan,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" fa#","red":[0,1,1,1]},{"text":"son signo y homenaje de la vida.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE.             si","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Misterio de ofrecerte y recibirnos,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE               LA","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"humanidad que Cristo diviniza.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"SANTO ES EL SEÑOR MI DIOS","number":10,"lines":[{"text":"La        SOL         re      MI","red":[1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1]},{"text":"Santo es el Señor, mi Dios, digno de alabanza.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"   la    SOL      re        MI","red":[0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1]},{"text":"A Él el poder, el honor y la gloria.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" la","red":[0,1,1]},{"text":"Hosanna (hosanna),","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" SOL","red":[0,1,1,1]},{"text":"hosanna (hosanna),","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" fa# MI     (MI7)","red":[0,1,1,1,0,1,1,0,0,0,0,0,1,1,1,1,1]},{"text":"hosanna, oh Se-ñor.   / (Nuestro Dios)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"la       SOL     re      MI","red":[1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1]},{"text":"Bendito el que viene en nombre del Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"   la    SOL      re     MI","red":[0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1]},{"text":"Con todos tus santos cantamos para Ti.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"VENDRÁ (BENEDICTUS) -  (Luispo)","number":11,"lines":[{"text":"RE                                SOL","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Por la entrañable misericordia de Nuestro Dios","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         mi                         LA","red":[0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"nos visitará el Sol que nace de lo alto","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"fa#                          si","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"para iluminar a los que viven en tinieblas","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" SOL    mi       LA","red":[0,1,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1]},{"text":"y en sombra de muerte,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       RE              SOL          mi            LA","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":" para guiar nuestros pasos por el camino de la paz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         fa#      si        SOL       mi    LA","red":[0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1]},{"text":"¡Bendito sea el Señor, el Salvador que vendrá!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"      RE              SOL          mi           LA","red":[0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Para guiar nuestros pasos por el camino de la paz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         fa#      si        SOL       mi     LA","red":[0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1]},{"text":"¡Bendito sea el Señor, el Salvador que vendrá!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"MI                                LA","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Por la entrañable misericordia de Nuestro Dios","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"      fa#                           SI7","red":[0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"nos visitará el Sol que nace de lo alto","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       sol#                       do#","red":[0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"para iluminar a los que viven en tinieblas","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" LA     fa#      SI7","red":[0,1,1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1]},{"text":"y en sombra de muerte,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"MI                  do#           LA          SI7","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"para guiar nuestros pasos por el camino de la paz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"[cejilla 2]","red":[0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"       sol#       do#","red":[0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1]},{"text":"¡Bendito sea el Señor,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    LA     fa#    SI7","red":[0,0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1]},{"text":"el Salvador que vendrá!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"MI                do#","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Para guiar nuestros pasos","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    LA          SI7","red":[0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"por el camino de la paz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"        sol#      do#","red":[0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1]},{"text":"¡Bendito sea el Señor,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       LA     fa#  SI7","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,1,1,1]},{"text":"el Salvador que vendrá!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"MI - LA - fa# - SI7","red":[1,1,0,0,0,1,1,0,0,0,1,1,1,0,0,0,1,1,1]},{"text":"","red":[]},{"text":"       sol#      do#","red":[0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1]},{"text":"¡Bendito sea el Señor,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     LA      fa#  SI7","red":[0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,0,0,1,1,1]},{"text":"el Salvador que vendrá!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"UNA VIRGEN DARÁ A LUZ","number":12,"lines":[{"text":"(Mariano Durán)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"mi","red":[1,1]},{"text":"Una Virgen dará a luz","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    RE             mi","red":[0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"a su hijo el Emmanuel","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    DO                   la","red":[0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"y su nombre es Rey de Paz,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       mi","red":[0,0,0,0,0,0,0,1,1]},{"text":"¡aleluya!","red":[0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"mi              RE              mi","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"El pueblo que camina en las tinieblas","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"  SI7                 mi","red":[0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"verá un gran resplandor;","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"MI                                   do#","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"a los que viven en las sombras de la muerte,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" fa#   SI7      MI-SI7","red":[0,1,1,1,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1]},{"text":"les nacerá la luz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Una Virgen dará a luz…","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"mi            RE            mi","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Una Virgen habrá de concebir,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     SI7           mi","red":[0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"y un Hijo dará a luz;","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"MI                                do#","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"su nombre es Emmanuel: Dios con nosotros;","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"      fa#      SI7      MI-SI7","red":[0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1]},{"text":"su alimento, leche y miel.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"SE NOTA, SE SIENTE","number":13,"lines":[{"text":"(Hermanas pobres y Luispo)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"la                    re","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Cargadito voy, a paso de peregrino,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SOL                  DO","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"mi peso es mi Amor, mi vida vivir contigo.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"  MI                  la","red":[0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Hoy mi corazón ardía por el camino","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"FA         MI","red":[1,1,0,0,0,0,0,0,0,0,0,1,1]},{"text":"cuando nos hablabas con Fuego divino.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"LA","red":[1,1]},{"text":"Se nota, se siente, que viene,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"que me enamora","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    RE","red":[0,0,0,0,1,1]},{"text":"y que me regala y promete","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"MI","red":[1,1]},{"text":"¡el ciento por uno ahora y la Vida eterna!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE         LA  MI","red":[1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1]},{"text":"¡Cuánta Belleza!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"LA","red":[1,1]},{"text":"Se nota, se siente,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"que todo lo que deseo es","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       RE","red":[0,0,0,0,0,0,0,1,1]},{"text":"tenerle siempre y me ofrece","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     MI","red":[0,0,0,0,0,1,1]},{"text":"¡el ciento por uno ahora y la Vida eterna!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE          LA","red":[1,1,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"¡Cuánta Belleza!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"la                          re","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Emaús es hoy, el sol se ha quedado fijo","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"   SOL                DO","red":[0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"con cada canción que arranca con tus silbidos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" MI                  la","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Hoy mi corazón ardía por el camino","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"      FA         MI","red":[0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1]},{"text":"cuando nos hablabas con Fuego divino.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Se nota, se siente…","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"[cejilla 3]","red":[0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"MI                      LA","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"¡Y que ardan hoy muchos corazones","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SI7                                        MI","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"que lleven Fuego a todos los hombres! do# LA","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1]},{"text":"¡Que digan sí muchos corazones","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"(¡que sí, que sí!)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    MI       SI7             MI.  SI7","red":[0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,1,1,1]},{"text":"que por el camino llamas por su nombre!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"MI                       LA","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"¡Y que ardan hoy muchos corazones","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SI7                         MI","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"que lleven Fuego a todos los hombres!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"do#                LA","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"¡Que digan sí muchos corazones","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"(¡que sí, que sí!)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    MI       SI7              MI  SI7","red":[0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,1]},{"text":"que por el camino llamas por su nombre!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"MI                 LA","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Leré leré leleré lerelé","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SI7                MI","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Leré leré leleré lerelé","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"do#               LA","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"¡Que digan sí muchos corazones","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"(¡que sí, que sí!)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    MI      SI7","red":[0,0,0,0,1,1,0,0,0,0,0,0,1,1,1]},{"text":"que por el camino","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" LA SI7 MI     SI7-MI","red":[0,1,1,0,1,1,1,0,1,1,0,0,0,0,0,1,1,1,1,1,1]},{"text":"llamas por su nombre!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"MAGNIFICAT","number":14,"lines":[{"text":"(Gen Verde)","red":[0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"            La          DO  FA            DO","red":[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Mi alma canta, canta la grandeza del Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"              la    SOL    la             SOL la","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1]},{"text":"Y mi espíritu se estremece de gozo en Dios,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                 MI la","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1]},{"text":"mi Salvador (bis).","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"                    DO SOL la","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,0,1,1]},{"text":"Porque miró con bondad","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                  DO  SOL       la","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,1,0,0,0,0,0,0,0,1,1]},{"text":"la pequeñez de su servidora (bis)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                    DO    SOL la","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,1,1]},{"text":"En adelante todas las gente","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                 DO SOL la","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,0,1,1]},{"text":"me llamarán feliz,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                 DO SOL","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1]},{"text":"me llamarán feliz,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                                        MI                 la","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"me llamarán feliz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"                   FA            DO","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Derribó del trono a los poderosos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                      FA DO","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1]},{"text":"Y ensalzó a los humildes.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                FA               DO","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Colmó de bienes a los hambrientos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"               FA                          DO","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Y despidió a los ricos con las manos vacías.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                 FA              DO","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Mi alma canta la grandeza del Señor","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                 FA            DO         SOL la","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1]},{"text":"y mi espíritu se estremece de gozo en Dios.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"           MI la","red":[0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1]},{"text":"Mi Salvador.","red":[0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Mi alma canta, canta la grandeza del Señor…","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"DIJISTE SÍ (Luispo)","number":15,"lines":[{"text":"        LA                             RE","red":[0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Dijiste Sí y la tierra estallo de alegría","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"        MI                             LA        MI","red":[0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1]},{"text":"Dijiste Sí y en tu vientre latía divina, la Salvación.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"           RE        MI           do#            fa#","red":[0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Hágase en mí, de corazón, la voluntad de mi Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       SI                             MI","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Que se cumplan en mí cada día los sueños de Dios.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" LA                           fa#","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"María, las tinieblas se harán mediodía","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                     RE","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"a una sola palabra que digas,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                               MI","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"en tus labios alumbra ya el Sol.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" LA                                 fa#","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"María, la doncella que Dios prometía,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                      RE","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"un volcán de ternura divina,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"   si                    MI  (fa#)","red":[0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,1,1,1]},{"text":"primavera de un Dios Redentor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"          LA                              RE","red":[0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Gabriel tembló, conmovido con tanta belleza","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         MI","red":[0,0,0,0,0,0,0,0,0,1,1]},{"text":"Madre de Dios,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                       LA          MI","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"cuélame en tu mirada de amor de la Anunciación.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"                 RE        MI           do#      fa#","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1]},{"text":"Hágase en mí, de corazón, la voluntad de mi Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       SI                              MI","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"que se cumplan en mí cada día los sueños de Dios.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"LA                            fa#","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"María, las tinieblas se harán mediodía…","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Final:  si               MI      LA (RE – LA – MI – LA)","red":[0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,1,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,1]},{"text":"       Primavera de un Dios Redentor","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"EN EL MAR HE OIDO HOY (Padre nuestro)","number":16,"lines":[{"text":"SOL  – mi – DO – RE  o DO – la – FA – SOL (cej 2 o 3)","red":[1,1,1,0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"En el mar he oído hoy,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"Señor tu voz que me llamó,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"y me pidió que me entregara a mis hermanos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Esa voz me transformó","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"mi vida entera ella cambió.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Y solo pienso ahora Señor en repetirte.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Padre nuestro, en Ti creemos,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"Padre nuestro, te ofrecemos,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"Padre nuestro, en nuestras manos","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"de hermanos (bis).","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Cuando vaya a otro lugar,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"tendré Señor que abandonar","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"a mi familia, a mis amigos, por seguirte.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Pero sé que así algún día","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"Podré enseñar tu verdad","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"a mi hermano, y junto a él , yo repetirte.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"ESTRIBILLO","red":[0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Bocas cerradas (Se reza el Padre nuestro)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"LA FILA (Hakuna)","number":17,"lines":[{"text":"(la – MI – la7 – la)","red":[1,1,1,0,0,0,1,1,0,0,0,1,1,1,0,0,0,1,1,1]},{"text":"[cejilla 4]","red":[0,0,0,0,0,0,0,0,0,0,0]},{"text":"la            MI      la7    la","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1]},{"text":"La fila más importante de mi vida.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"   la           MI        la7  MI","red":[0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,1,1]},{"text":"Unos minutos me separan del momento.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    la                                SOL","red":[0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"De encontrarme con mi amante cara a cara, con Dios Carne.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     FA                                       SOL              MI","red":[0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"No soy digna de que entres en mi casa//pero una palabra tuya bastará//","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       la   (MI – la7 – MI)","red":[0,0,0,0,0,0,0,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1]},{"text":"para sanarme.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       la                   SOL            DO                 SOL","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Cada segundo / se hace una eternidad, si es para tenerte no importa","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"            la                 SOL","red":[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"esperar / Y es este hormigueo que no cesa hasta que te veo. Cada","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" la                      SOL                   la (MI – la7 – MI)","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1]},{"text":"paso hacia delante // es un paso hacia el cielo.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"    la                           DO","red":[0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Y ligeramente elevado, y con un Amén contestado.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"      SOL                            MI","red":[0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Por fin frente a un Pan que se ha hecho humano.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"             FA            DO      SOL          la     FA","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1]},{"text":"Y cuando el Cuerpo de Cristo, se une a mí, me transformo, me hago","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"DO          SOL           la","red":[1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"uno con quién // más me ama.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"          FA        DO        SOL        la","red":[0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1,1]},{"text":"Es el que sacia el hambre de todo existir.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"   FA                    DO                    SOL","red":[0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"El sagrario hacia el que siempre estoy arrodillada.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                    FA      DO                        SOL","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Si los Ángeles hablaran, concienciarían nuestra alma. Es el Rey de los","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"    FA       DO              SOL                                  FA-DO-SOL","red":[0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1]},{"text":"amores, que nos alimenta y habla. A quien todo el cielo alaba. (x2)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"(MI)  la","red":[1,1,1,1,0,0,1,1]},{"text":"Aprieto mis costados, para que sientas mis abrazos.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                            la7","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Que Dios no está en el pan, que Dios es este Pan, que yo misma lo he","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"     la","red":[0,0,0,0,0,1,1]},{"text":"tocado con mis labios.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"   la                   SOL        DO                        SOL","red":[0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Busca un hueco en mi corazón, limpia todo lo que hay en mi interior.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         la                        SOL                      DO       SOL","red":[0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,1]},{"text":"Que está boca que Tú tocas solo sepa hablar //el lenguaje, el lenguaje","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"     la (MI – la7 – MI)","red":[0,0,0,0,0,1,1,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1]},{"text":"del Amor.","red":[0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"      la                   DO","red":[0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Y ligeramente elevado, y con un Amén contestado.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"  SOL                                      MI","red":[0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Por fin frente a un Pan que se ha hecho humano.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Estribillo","red":[0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"  FA               DO               SOL           la","red":[0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Y ahora que estás conmigo Señor, hazme saber que estás vivo en mí.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"FA                 DO                 SOL           la","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Que no eres un alimento más, que es tu cuerpo inmolado por mí.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" FA                 DO","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Y ahora que estás conmigo Señor","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SOL               la","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"hazme saber que estás vivo en mí","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"FA             DO                     SOL           la        (RE FA)","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1]},{"text":"Ahora ya soy miembro de tu Cuerpo,  unido a mis hermanos en Ti.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Estribillo","red":[0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"                        FA  - DO - SOL","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,1,1,1]},{"text":"A quien todo el cielo alaba. (x 5)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"ENCIÉNDEME (Hakuna)","number":18,"lines":[{"text":"RE                                                       SOL","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"[cejilla 2]","red":[0,0,0,0,0,0,0,0,0,0,0]},{"text":"Hoy quiero, Señor, ponerlo todo en tu presencia.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"si                  LA","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Darme hasta gastarme contigo y por Ti.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"RE                      SOL                             si","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Hoy quiero, Señor, ponerlo todo ante tu puerta para en todo amarte y","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"LA","red":[1,1]},{"text":"servir.","red":[0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"         RE                           SOL","red":[0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Enciéndeme y déjame arder donde haga falta.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"   RE                  SOL","red":[0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Enciéndeme y déjame ser tu luz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       RE                       SOL","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Y así poder llevarte hasta todas las almas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       RE        LA7             RE","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Saciar la sed que tienes Tú desde la cruz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"RE                    SOL                   si","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Hoy quisiera madre, poner todo en tu presencia. Darme hasta","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"           LA         RE                      SOL","red":[0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"gastarme, decirle que sí. Hoy te pido Madre, que dejes mi puerta","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         si                 LA","red":[0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"abierta, para en todo amarle y servir.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"          RE                     SOL","red":[0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Enciéndeme y déjame arder donde haga falta.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"        RE                    SOL","red":[0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Enciéndeme y déjame ser tu luz.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       RE                      SOL","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Y así poder llevarte hasta todas las almas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"       RE            LA7                RE","red":[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Saciar la sed que tienes Tú desde la cruz. (x2)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"A TI TE ALABO","number":19,"lines":[{"text":"RE","red":[1,1]},{"text":"A ti te alabo, Señor, en tu templo.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"[cejilla 1]","red":[0,0,0,0,0,0,0,0,0,0,0]},{"text":"         LA","red":[0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo con todo el firmamento.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"          si","red":[0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo con todo lo que Tú has hecho.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"           SOL","red":[0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"A ti te alabo Padre, Hijo, Amor eterno.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"           RE","red":[0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo con trompas y flautas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"           LA","red":[0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo con tambores y danzas.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"           si","red":[0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alaban criaturas y animales.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"          SOL","red":[0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"A ti te alaban las montañas y los mares.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"           si / RE / SOL","red":[0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,1]},{"text":"A ti te alaaaaaban.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"   si              RE           SOL","red":[0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"A ese ser que creó este mundo por amor,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"¡no // lo // encontrabaaa!.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"si             RE                 SOL","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"No creías que fuera posible este don: un Dios.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SOL                    RE","red":[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Todo lo que veo a mi alrededor,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"si                           SOL","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"grita que aquí estás y esconde mi temor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                    RE                              LA","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Todo ser que aliente alabe al Señor y grite bien fuerte:","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Estribillo","red":[0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"           RE","red":[0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo, aunque te escondas,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"aunque yo no pueda verte.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"SOL","red":[1,1,1]},{"text":"A ti te alabo, que me salvas de la muerte.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"                    LA","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo en el silencio de un amor","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"que ya no siente.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"                si","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo: eres mi Dios, eres mi Vida,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"eres mi Fuerte.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         RE","red":[0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo en lo sencillo, cotidiano, diferente.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         SOL","red":[0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"A ti te alabo con el Vivo,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"que te busca ansiadamente.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         LA","red":[0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo con el  muerto, que te espera nuevamente.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         si","red":[0,0,0,0,0,0,0,0,0,1,1]},{"text":"A ti te alabo,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                       LA","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"¡eres mi Dios, eres mi Vida!","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"        SOL  / si / LA","red":[0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,0,0,0,1,1]},{"text":"A ti te alaaaabo (x3).","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"         SOL/LA/si. (SOL)","red":[0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1]},{"text":"A ti te alabo.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{"title":"DIJISTE SÍ","number":20,"lines":[{"text":"         DO                       FA","red":[0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Dijiste Sí y la tierra estallo de alegría.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         SOL                           DO            SOL","red":[0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Dijiste Sí y en tu vientre latía divina, la Salvación.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"          FA      SOL       mi            la","red":[0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"Hágase en mí, de corazón, la voluntad de mi Señor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" RE                                      SOL","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Que se cumplan en mí cada día los sueños de Dios.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" DO                           la","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"María, las tinieblas se harán mediodía","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                      FA","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"a una sola palabra que digas,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                               SOL","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"en tus labios alumbra ya el Sol.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":" DO                          la","red":[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"María, la doncella que Dios prometía,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                       FA","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]},{"text":"un volcán de ternura divina,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"re                 SOL","red":[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"primavera de un Dios Redentor.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"          RE                        SOL","red":[0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Gabriel tembló, conmovido con tanta belleza","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"         LA7","red":[0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"Madre de Dios,","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"                       RE          LA7","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1]},{"text":"cuélame en tu mirada de amor de la Anunciación.","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"","red":[]},{"text":"Hágase en mí, de corazón…","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"text":"            mi                 LA7        RE        (LA7-RE)","red":[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1]},{"text":"Final:  Primavera de un Dios Redentor. (EN BIS)","red":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]}];
  let incorporado = false;
  function incorporar() {
    if (incorporado || !songs.some(canto => canto.cmWord)) return;
    incorporado = true;
    if (songs.some(canto => canto.cmBook === 'adviento2026')) return;
    cantos.forEach(canto => songs.push({
      title: canto.title + ' · ' + nombre,
      body: canto.lines.map(linea => linea.text).join('\n'),
      cmBook: 'adviento2026',
      cmBookName: nombre,
      cmPrealigned: true,
      cmWordLines: canto.lines
    }));
  }
  const anterior = render;
  render = function () {
    incorporar();
    anterior();
  };
  const listarAntes = renderList;
  renderList = function () {
    listarAntes();
    document.querySelectorAll('#list .song .open').forEach(boton => {
      const numero = boton.getAttribute('onclick')?.match(/openSong\((\d+)\)/);
      const canto = numero ? songs[Number(numero[1])] : null;
      if (!canto?.cmBook) return;
      const detalle = boton.querySelector('.muted');
      boton.replaceChildren(document.createTextNode(canto.title));
      if (detalle) boton.appendChild(detalle);
    });
  };
  incorporar();
})();

/* PDF local para imprimir celebraciones desde el icono del iPad */
(function () {
  let ultimoPdf = null;
  function hex(texto) {
    const especiales = {'€':128,'‘':145,'’':146,'“':147,'”':148,'–':150,'—':151,'…':133};
    return Array.from(String(texto).normalize('NFC')).map(c => {
      const n = especiales[c] ?? (c.charCodeAt(0) <= 255 ? c.charCodeAt(0) : 63);
      return n.toString(16).padStart(2, '0');
    }).join('');
  }
  window.cmCelebracionPdf = function (evento) {
    const paginas = [];
    let comandos = [], y = 790;
    function escribir(texto, x, alto, tamano = 10, rojo = false) {
      comandos.push(`BT /F1 ${tamano} Tf ${rojo ? '0.72 0.08 0.12' : '0.1 0.1 0.1'} rg 1 0 0 1 ${x} ${alto} Tm <${hex(texto)}> Tj ET\n`);
    }
    function terminar() {
      escribir('Claret Music · ' + (paginas.length + 1), 40, 25, 9);
      paginas.push(comandos.join('')); comandos = []; y = 790;
    }
    function espacio(altura) { if (y - altura < 48) terminar(); }
    function titulo(texto, tamano) {
      const limite = Math.floor(515 / (tamano * 0.6));
      const palabras = String(texto || '').split(/\s+/); let linea = '';
      for (const palabra of palabras) {
        if (linea && (linea + ' ' + palabra).length > limite) {
          espacio(tamano + 7); escribir(linea, 40, y, tamano); y -= tamano + 7; linea = '';
        }
        linea += (linea ? ' ' : '') + palabra;
      }
      if (linea) { espacio(tamano + 7); escribir(linea, 40, y, tamano); y -= tamano + 7; }
    }
    titulo(evento.name || 'Celebración', 16);
    titulo(evento.community || '', 11);
    titulo(evento.date || '', 10);
    y -= 8;
    for (const entrada of evento.entries || []) {
      const canto = songs[entrada.song]; if (!canto) continue;
      espacio(90);
      titulo(entrada.moment || '', 12);
      titulo(canto.title.replace(/\s*\((PDF|Word)\)/gi, ''), 11);
      let lineas = canto.cmWordLines || cmPrepararAtril(canto);
      if (canto.cmWordLines && !canto.cmPrealigned) {
        lineas = lineas.map((linea, i) => {
          if (!linea.red.some(Boolean) || !lineas[i + 1] || lineas[i + 1].red.some(Boolean)) return linea;
          const letras = [], rojo = [];
          for (const m of linea.text.matchAll(/\S+/g)) {
            const pos = Math.max(Math.round(m.index * 0.56), letras.length + (letras.length ? 1 : 0));
            while (letras.length < pos) { letras.push(' '); rojo.push(0); }
            letras.push(...m[0]); rojo.push(...Array(m[0].length).fill(1));
          }
          return {text: letras.join(''), red: rojo};
        });
      }
      const grupos = [];
      for (let i = 0; i < lineas.length; i++) {
        const grupo = [lineas[i]];
        if (lineas[i].red.some(Boolean) && lineas[i + 1] &&
            !lineas[i + 1].red.some(Boolean) && lineas[i + 1].text.trim()) grupo.push(lineas[++i]);
        grupos.push(grupo);
      }
      for (const grupo of grupos) {
        const longitud = Math.max(...grupo.map(l => l.text.length), 1);
        let inicio = 0;
        while (inicio < longitud) {
          let fin = Math.min(longitud, inicio + 85);
          const seguro = p => grupo.every(l => !l.red[p - 1] || !l.red[p] || /\s/.test(l.text[p - 1] || '') || /\s/.test(l.text[p] || ''));
          if (fin < longitud) {
            const letra = grupo.find(l => !l.red.some(Boolean));
            let corte = fin;
            while (corte > inicio + 35 && (!seguro(corte) || (letra && !/\s/.test(letra.text[corte] || ' ')))) corte--;
            if (corte > inicio + 35) fin = corte;
            else while (fin > inicio + 1 && !seguro(fin)) fin--;
          }
          espacio(grupo.length * 14);
          for (const linea of grupo) {
            const texto = linea.text.slice(inicio, fin), rojos = linea.red.slice(inicio, fin);
            for (let j = 0; j < texto.length;) {
              const esRojo = Boolean(rojos[j]); let k = j + 1;
              while (k < texto.length && Boolean(rojos[k]) === esRojo) k++;
              escribir(texto.slice(j, k), 40 + j * 6, y, 10, esRojo); j = k;
            }
            y -= 14;
          }
          inicio = fin;
        }
      }
      y -= 16;
    }
    terminar();
    const objetos = ['', '<< /Type /Catalog /Pages 2 0 R >>', '',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'];
    const hijos = [];
    for (const contenido of paginas) {
      const id = objetos.length; hijos.push(`${id} 0 R`);
      objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`);
      objetos.push(`<< /Length ${contenido.length} >>\nstream\n${contenido}endstream`);
    }
    objetos[2] = `<< /Type /Pages /Kids [${hijos.join(' ')}] /Count ${hijos.length} >>`;
    let pdf = '%PDF-1.4\n'; const posiciones = [0];
    for (let i = 1; i < objetos.length; i++) {
      posiciones.push(pdf.length); pdf += `${i} 0 obj\n${objetos[i]}\nendobj\n`;
    }
    const tabla = pdf.length;
    pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
    for (const posicion of posiciones.slice(1)) pdf += String(posicion).padStart(10, '0') + ' 00000 n \n';
    pdf += `trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${tabla}\n%%EOF`;
    return new Blob([pdf], {type:'application/pdf'});
  };
  window.cmImprimirCelebracion = function () {
    const desdeIcono = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (!desdeIcono) { window.print(); return; }
    const evento = cmReadonly || cmGet(); if (!evento) return;
    const pdf = cmCelebracionPdf(evento);
    const nombre = (evento.name || 'Celebracion').replace(/[^\p{L}\p{N}_ -]/gu, '').slice(0, 80) + '.pdf';
    const archivo = new File([pdf], nombre, {type:'application/pdf'});
    function abrir() {
      if (ultimoPdf) URL.revokeObjectURL(ultimoPdf);
      ultimoPdf = URL.createObjectURL(pdf);
      document.getElementById('cm-pdf-local')?.remove();
      const panel = document.createElement('div'); panel.id = 'cm-pdf-local'; panel.className = 'cm-panel';
      const texto = document.createElement('p'); texto.textContent = 'PDF preparado. Ábrelo y usa Compartir para imprimirlo o guardarlo.';
      const enlace = document.createElement('a'); enlace.href = ultimoPdf; enlace.target = '_blank';
      enlace.textContent = 'Abrir PDF'; enlace.className = 'action';
      panel.append(texto, enlace); document.querySelector('.cm-actions')?.after(panel);
    }
    if (navigator.canShare && navigator.canShare({files:[archivo]})) {
      navigator.share({files:[archivo]}).catch(error => {if (error.name !== 'AbortError') abrir();});
    } else abrir();
  };
  const antes = cmRenderRead;
  cmRenderRead = function () {
    antes();
    document.querySelectorAll('.cm-actions button').forEach(boton => {
      if (boton.getAttribute('onclick') === 'window.print()') {
        boton.removeAttribute('onclick'); boton.onclick = cmImprimirCelebracion;
      }
    });
  };
})();
/* Abrir la vista previa desde el principio */
(function () {
  const abrirAntes = cmOpenReadonly;

  cmOpenReadonly = function () {
    abrirAntes();
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };
})();
/* Explicar para qué sirve el modo atril */
(function () {
  const anterior = cmRenderRead;

  cmRenderRead = function () {
    anterior();

    const boton = document.getElementById('cm-at-button');
    if (!boton || document.getElementById('cm-atril-nota')) return;

    const nota = document.createElement('p');
    nota.id = 'cm-atril-nota';
    nota.className = 'hint';
    nota.textContent =
      '🎸 ¿Tocas la guitarra? Abre el modo atril para ver los acordes y cambiar el tono de las canciones.';

    boton.parentElement.after(nota);
  };
})();
