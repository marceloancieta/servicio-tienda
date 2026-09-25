/**
 * TEST SUITE 1 - Productos
 *
 * Valida el recurso /productos del servicio-tienda.
 * Cubre: status, contrato, reglas de negocio (precio > 0, stock >= 0,
 * categorias validas) y filtros por categoria / activo.
 *
 * Requiere la API corriendo: npm run api (puerto 3001)
 */
const BASE = 'http://localhost:3001';
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

async function suite() {
  console.log('\n── TEST SUITE: Productos ──────────────────────────────');

  // 1) GET /productos - status y estructura basica
  console.log('\n[1] Listado general y contrato');
  const r1 = await fetch(BASE + '/productos');
  check('GET /productos -> 200', r1.status === 200);
  const productos = await r1.json();
  check('Devuelve un array', Array.isArray(productos));
  check('Hay al menos 5 productos', productos.length >= 5);

  // Contrato de cada producto
  const camposReq = ['id','nombre','categoria','precio','stock','activo'];
  productos.forEach(p => {
    camposReq.forEach(c => check('Tiene campo "' + c + '" (id=' + p.id + ')', p[c] !== undefined));
  });

  // 2) Reglas de negocio
  console.log('\n[2] Reglas de negocio');
  const categoriasValidas = ['electronica', 'muebles', 'hogar', 'ropa', 'deportes'];
  productos.forEach(p => {
    check('Precio > 0 (id=' + p.id + ')', p.precio > 0, 'precio=' + p.precio);
    check('Stock >= 0 (id=' + p.id + ')', p.stock >= 0, 'stock=' + p.stock);
    check('Categoria valida (id=' + p.id + ')', categoriasValidas.includes(p.categoria), 'cat=' + p.categoria);
    check('activo es booleano (id=' + p.id + ')', typeof p.activo === 'boolean');
  });

  // 3) Filtro por categoria
  console.log('\n[3] Filtro por categoria');
  const r3 = await fetch(BASE + '/productos?categoria=electronica');
  check('GET /productos?categoria=electronica -> 200', r3.status === 200);
  const electronicos = await r3.json();
  check('Devuelve solo electronicos', electronicos.every(p => p.categoria === 'electronica'),
    'hay ' + electronicos.length);

  // 4) Filtro activo=true
  console.log('\n[4] Filtro activos');
  const r4 = await fetch(BASE + '/productos?activo=true');
  const activos = await r4.json();
  check('Solo activos en resultado', activos.every(p => p.activo === true));
  check('Hay al menos 1 activo', activos.length >= 1);

  // 5) GET /productos/:id - producto individual
  console.log('\n[5] Producto individual');
  const r5 = await fetch(BASE + '/productos/1');
  check('GET /productos/1 -> 200', r5.status === 200);
  const p1 = await r5.json();
  check('id = 1', p1.id === 1);
  check('nombre es string no vacio', typeof p1.nombre === 'string' && p1.nombre.length > 0);

  // 6) Producto inexistente
  console.log('\n[6] Producto inexistente');
  const r6 = await fetch(BASE + '/productos/9999');
  check('GET /productos/9999 -> 404', r6.status === 404);

  return { pasadas, falladas, errores };
}

export { suite };
