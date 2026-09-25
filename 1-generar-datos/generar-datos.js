/**
 * PASO 1 - Generar los datos del servicio-tienda con Faker.
 *
 * Este es el PRIMER paso del pipeline: en vez de escribir el dataset a mano,
 * lo generamos por codigo con Faker (igual que en el Dia 1). Produce:
 *   2-servicio/db.seed.json   -> estado original, listo para json-server
 *
 * Los datos NO se versionan en Git: se generan en cada corrida. Por eso este
 * script es lo primero que corre, tanto en local como en la fase pre_build de CodeBuild.
 *
 * Formato de salida (compatible con json-server):
 *   { "productos": [...], "pedidos": [...] }
 *
 * Semilla FIJA (faker.seed) -> mismos datos en cada corrida. Esto es clave:
 * los tests son deterministas, siempre validan el mismo dataset.
 *
 * Ejecutar desde la carpeta raiz del proyecto:
 *   node 1-generar-datos/generar-datos.js
 *   npm run generar
 */
import { faker } from '@faker-js/faker';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rutaSeed = path.join(__dirname, '..', '2-servicio', 'db.seed.json');

// Semilla fija -> dataset reproducible (comenta para datos aleatorios)
faker.seed(2025);

// Listas cerradas para que los datos cumplan las reglas de negocio de los tests
const CATEGORIAS = ['electronica', 'muebles', 'hogar', 'ropa', 'deportes'];
const ESTADOS    = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];

const CANT_PRODUCTOS = 10;
const CANT_PEDIDOS   = 5;

// ── Generar productos ────────────────────────────────────────
function crearProducto(id) {
  return {
    id,
    nombre: faker.commerce.productName(),
    categoria: faker.helpers.arrayElement(CATEGORIAS),
    precio: Number(faker.commerce.price({ min: 20, max: 2500, dec: 2 })),
    stock: faker.number.int({ min: 0, max: 80 }),
    activo: true
  };
}

const productos = Array.from({ length: CANT_PRODUCTOS }, (_, i) => crearProducto(i + 1));

// Caso de borde a proposito: el ultimo producto queda inactivo y sin stock
// (igual que hacemos en el Dia 1 con los datos imperfectos)
productos[productos.length - 1].activo = false;
productos[productos.length - 1].stock = 0;

// ── Generar pedidos (relacionados a productos existentes) ────
function crearPedido(id) {
  return {
    id,
    productoId: faker.number.int({ min: 1, max: CANT_PRODUCTOS }),
    cliente: faker.internet.email().toLowerCase(),
    cantidad: faker.number.int({ min: 1, max: 5 }),
    estado: faker.helpers.arrayElement(ESTADOS),
    fecha: faker.date.recent({ days: 30 }).toISOString().slice(0, 10)
  };
}

const pedidos = Array.from({ length: CANT_PEDIDOS }, (_, i) => crearPedido(i + 1));

// ── Escribir el seed en formato json-server ──────────────────
const db = { productos, pedidos };
fs.mkdirSync(path.dirname(rutaSeed), { recursive: true });
fs.writeFileSync(rutaSeed, JSON.stringify(db, null, 2));

// ── Resumen en consola ───────────────────────────────────────
console.log('===== PASO 1: generar datos con Faker =====');
console.log('Generados ' + productos.length + ' productos y ' + pedidos.length + ' pedidos.');
console.log('Escrito en 2-servicio/db.seed.json (formato { productos, pedidos }).');
console.log('Caso de borde: producto ' + productos.length + ' inactivo, stock 0.');
console.log('Ejemplo producto: ' + productos[0].nombre + ' (' + productos[0].categoria + ') $' + productos[0].precio);
console.log('Ejemplo pedido:   ' + pedidos[0].cliente + ' -> producto ' + pedidos[0].productoId + ' [' + pedidos[0].estado + ']');
console.log('');
console.log('Siguiente paso:  npm run seed   (copia db.seed.json -> db.json)');
console.log('===========================================');
