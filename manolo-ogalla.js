/* Tres cancioneros de Manolo Ogalla CMF */
(function () {
  'use strict';
  const libros = [{"name":"A voces - Manolo Ogalla CMF","file":"A_voces_Manolo_Ogalla_CMF.pdf","songs":[{"title":"Simplemente te quiero","page":2},{"title":"A voces","page":3},{"title":"Mirando al margen","page":4},{"title":"El murmullo del río","page":5},{"title":"Hoy","page":6},{"title":"Tan solo una mirada","page":7},{"title":"Soneto de un viaje","page":8},{"title":"Desde entonces","page":9},{"title":"A oscuras","page":10}]},{"name":"Pasa la Voz - Manolo Ogalla CMF","file":"Pasa_la_Voz_Manolo_Ogalla_CMF.pdf","songs":[{"title":"Pasa la voz","page":2},{"title":"Ven Espíritu","page":3},{"title":"Tu perdón","page":3},{"title":"Oración de Claret","page":3},{"title":"Un derroche de perdón","page":3},{"title":"Gloria de resurrección","page":4},{"title":"Sólo tienes que soñar","page":5},{"title":"Es Navidad","page":6}]},{"name":"Yubal - Algo nuevo está brotando - Manolo Ogalla CMF","file":"Yubal_Manolo_Ogalla_CMF.pdf","songs":[{"title":"Ven","page":2},{"title":"Tú te empeñas (Sal 62)","page":3},{"title":"Aleluya","page":4},{"title":"Mira mis manos","page":4},{"title":"Santo de los pobres","page":5},{"title":"Paz","page":6},{"title":"Cada día algo más fiel","page":7},{"title":"Al partir el pan","page":8},{"title":"Ave María","page":9}]}];
  for (const libro of libros) {
    if (!cmLibraryBooks.some(b => b.file === libro.file)) cmLibraryBooks.push(libro);
  }
  function incorporar() {
    // Esperar a que los repertorios anteriores hayan ocupado sus posiciones.
    if (!songs.some(c => c.cmBook === 'adviento2026')) return false;
    let nuevos = false;
    for (const libro of libros) {
      if (songs.some(c => c.cmPdf?.file === libro.file)) continue;
      for (const canto of libro.songs) songs.push({
        title: canto.title + ' · ' + libro.name,
        body: 'Canción disponible en ' + libro.name + ', página ' + canto.page + '.',
        cmPdf: {file: libro.file, page: canto.page}
      });
      nuevos = true;
    }
    return nuevos;
  }
  const antes = render;
  render = function () {
    antes();
    if (incorporar() && current < 0) {
      if (mode === 'library') cmLibraryRender();
      else {
        if (document.getElementById('list')) renderList();
        if (document.getElementById('cm-results')) cmUpdateSearch();
      }
    }
  };
  incorporar();
})();
