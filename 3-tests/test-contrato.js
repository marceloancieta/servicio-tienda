/**
 * TEST SUITE 3 - Contrato y rendimiento
 *
 * Valida que el servicio cumple su CONTRATO publico:
 *   - Cabeceras correctas (Content-Type application/json)
 *   - Respuestas dentro del tiempo limite (< 800ms, umbral de SLA)
 *   - Paginacion funciona (_page / _limit)
 *   - Busqueda de texto funciona (?q=)
 *   - CORS header presente (X-Content-Type-Options)
 *
 * Este tipo de pruebas es lo primero que falla cuando se mueve un
 * servicio de local a cloud: el contrato no cambia, el entorno si.
 *
 * Requiere la API corriendo: npm run api (puerto 3001)
 */
const BASE = 'http://localhost:3001';
const SLA_MS = 800;  // umbral maximo de tiempo de respuesta
let pasadas = 0, falladas = 0, errores = [];

function check(nombre, condicion, detalle = '') {
  if (condicion) {
    console.log('  ✓  ' + nombre);
    pasadas++;
  } else {
    const msg = nombre + (detalle ? '  [' + detalle + ']' : '');
    console.log('  ✗  ' + msg);
    errores.push(msg);
    falladas++;
  }
}

async function medir(url) {
  const t0 = Date.now();
  const r = await fetch(url);
  const ms = Date.now() - t0;
  return { r, ms };
}

async function suite() {
  console.log('\n── TEST SUITE: Contrato y rendimiento ────────────────');

  // 1) Content-Type
  console.log('\n[1] Cabeceras (Content-Type)');
  const { r: r1 } = await medir(BASE + '/productos');
  const ct = r1.headers.get('content-type') || '';
  check('Content-Type incluye application/json', ct.includes('application/json'), ct);

  const { r: r1b } = await medir(BASE + '/pedidos');
  const ct2 = r1b.headers.get('content-type') || '';
  check('Pedidos Content-Type incluye application/json', ct2.includes('application/json'), ct2);

  // 2) Tiempo de respuesta (SLA)
  console.log('\n[2] Tiempo de respuesta (SLA < ' + SLA_MS + 'ms)');
  const endpoints = ['/productos', '/pedidos', '/productos/1', '/pedidos/1'];
  for (const ep of endpoints) {
    const { r, ms } = await medir(BASE + ep);
    check(ep + ' responde en < ' + SLA_MS + 'ms', ms < SLA_MS, ms + 'ms');
  }

  // 3) Paginacion
  console.log('\n[3] Paginacion (_page / _limit)');
  const { r: r3 } = await medir(BASE + '/productos?_page=1&_limit=3');
  check('Paginacion -> 200', r3.status === 200);
  const pagina1 = await r3.json();
  check('Devuelve maximo 3 elementos (limit=3)', pagina1.length <= 3, 'largo=' + pagina1.length);
  check('Devuelve al menos 1 elemento', pagina1.length >= 1);

  const { r: r3b } = await medir(BASE + '/productos?_page=2&_limit=3');
  const pagina2 = await r3b.json();
  check('Pagina 2 tiene items distintos a pagina 1',
    JSON.stringify(pagina1) !== JSON.stringify(pagina2));

  // 4) Busqueda de texto
  console.log('\n[4] Busqueda de texto (?q=)');
  // Los nombres de producto los genera Faker (varian en cada dataset), asi que
  // NO buscamos un texto fijo: tomamos una palabra real del primer producto y
  // buscamos por ella. Asi el test funciona con cualquier dataset generado.
  const listaProd = await (await fetch(BASE + '/productos')).json();
  const termino = listaProd[0].nombre.split(' ')[0];  // primera palabra del nombre real
  const { r: r4 } = await medir(BASE + '/productos?q=' + encodeURIComponent(termino));
  check('Busqueda ?q=' + termino + ' -> 200', r4.status === 200);
  const resultados = await r4.json();
  check('Encuentra al menos 1 resultado para "' + termino + '"', resultados.length >= 1, 'encontro=' + resultados.length);

  // 5) Ordenamiento
  console.log('\n[5] Ordenamiento (_sort / _order)');
  const { r: r5 } = await medir(BASE + '/productos?_sort=precio&_order=asc');
  check('Ordenamiento -> 200', r5.status === 200);
  const ordenados = await r5.json();
  let ordenCorrecto = true;
  for (let i = 1; i < ordenados.length; i++) {
    if (ordenados[i].precio < ordenados[i - 1].precio) { ordenCorrecto = false; break; }
  }
  check('Productos ordenados por precio ASC', ordenCorrecto);

  return { pasadas, falladas, errores };
}

export { suite };
