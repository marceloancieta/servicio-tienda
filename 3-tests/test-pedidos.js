/**
 * TEST SUITE 2 - Pedidos
 *
 * Valida el recurso /pedidos del servicio-tienda.
 * Cubre: status, contrato, estados validos, relacion productoId,
 * filtro por estado, y ciclo POST -> verificar -> DELETE.
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
  console.log('\n── TEST SUITE: Pedidos ────────────────────────────────');

  // 1) GET /pedidos - listado y contrato
  console.log('\n[1] Listado general y contrato');
  const r1 = await fetch(BASE + '/pedidos');
  check('GET /pedidos -> 200', r1.status === 200);
  const pedidos = await r1.json();
  check('Devuelve un array', Array.isArray(pedidos));
  check('Hay al menos 1 pedido', pedidos.length >= 1);

  const camposReq = ['id','productoId','cliente','cantidad','estado','fecha'];
  pedidos.forEach(p => {
    camposReq.forEach(c => check('Tiene "' + c + '" (id=' + p.id + ')', p[c] !== undefined));
  });

  // 2) Reglas de negocio
  console.log('\n[2] Reglas de negocio');
  const estadosValidos = ['pendiente','procesando','enviado','entregado','cancelado'];
  const emailRegex = /^[\w.-]+@[\w.-]+\.\w+$/;
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

  pedidos.forEach(p => {
    check('Estado valido (id=' + p.id + ')', estadosValidos.includes(p.estado), 'estado=' + p.estado);
    check('Cantidad >= 1 (id=' + p.id + ')', p.cantidad >= 1, 'cantidad=' + p.cantidad);
    check('Email cliente valido (id=' + p.id + ')', emailRegex.test(p.cliente), 'cliente=' + p.cliente);
    check('Fecha formato YYYY-MM-DD (id=' + p.id + ')', fechaRegex.test(p.fecha), 'fecha=' + p.fecha);
  });

  // 3) Filtro por estado
  console.log('\n[3] Filtro por estado');
  const r3 = await fetch(BASE + '/pedidos?estado=entregado');
  check('GET /pedidos?estado=entregado -> 200', r3.status === 200);
  const entregados = await r3.json();
  check('Solo pedidos entregados', entregados.every(p => p.estado === 'entregado'),
    'hay ' + entregados.length);

  // 4) Crear pedido -> verificar -> eliminar (ciclo CRUD)
  console.log('\n[4] Ciclo CRUD (POST -> GET -> DELETE)');
  const nuevoPedido = {
    productoId: 2,
    cliente: 'test.pipeline@empresa.com',
    cantidad: 2,
    estado: 'pendiente',
    fecha: new Date().toISOString().slice(0, 10)
  };

  const r4 = await fetch(BASE + '/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nuevoPedido)
  });
  check('POST /pedidos -> 201', r4.status === 201);
  const creado = await r4.json();
  check('Tiene id asignado', typeof creado.id === 'number');
  check('Estado es pendiente', creado.estado === 'pendiente');

  // Verificar que existe
  const r4b = await fetch(BASE + '/pedidos/' + creado.id);
  check('GET /pedidos/' + creado.id + ' -> 200', r4b.status === 200);

  // Eliminar (limpieza)
  const r4c = await fetch(BASE + '/pedidos/' + creado.id, { method: 'DELETE' });
  check('DELETE /pedidos/' + creado.id + ' -> 200', r4c.status === 200);

  // Confirmar que ya no existe
  const r4d = await fetch(BASE + '/pedidos/' + creado.id);
  check('Pedido borrado -> 404', r4d.status === 404);

  return { pasadas, falladas, errores };
}

export { suite };
