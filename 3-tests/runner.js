/**
 * RUNNER PRINCIPAL - ejecuta las 3 suites y genera reporte de resultados.
 *
 * Es el equivalente al paso "build" de CodeBuild:
 * corre todos los tests y sale con codigo 0 (OK) o 1 (fallo).
 * El pipeline lee ese codigo de salida para decidir si el build pasa o no.
 *
 * El runner LEVANTA la API por si mismo (json-server), espera a que responda,
 * corre los tests y la apaga al final. Asi funciona igual en local y en CI
 * (CodeBuild), sin depender de un proceso en background entre fases distintas.
 *
 * Ejecutar: npm test   o   node 3-tests/runner.js
 * (Si ya tienes la API corriendo aparte, el runner la reutiliza.)
 */
import { suite as suiteProductos } from './test-productos.js';
import { suite as suitePedidos }   from './test-pedidos.js';
import { suite as suiteContrato }  from './test-contrato.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(__dirname, '..');
const PUERTO = process.env.API_PORT || '3001';
const BASE = 'http://localhost:' + PUERTO;
const inicio = Date.now();

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║   RUNNER - Servicio Tienda  |  Dia 2 QA Cloud-Native ║');
console.log('╚══════════════════════════════════════════════════════╝');

// ── Levantar la API si no esta ya corriendo ──────────────────
let apiProc = null;

async function apiResponde() {
  try {
    const r = await fetch(BASE + '/productos');
    return r.ok;
  } catch { return false; }
}

async function asegurarApi() {
  if (await apiResponde()) {
    console.log('  API ya estaba corriendo en ' + BASE);
    return;
  }
  console.log('  Levantando API en ' + BASE + ' ...');
  apiProc = spawn('npx', ['json-server', '2-servicio/db.json', '--port', PUERTO], {
    cwd: raiz,
    stdio: 'ignore',
    shell: true
  });
  // Esperar hasta 10 intentos (20s) a que responda
  for (let i = 1; i <= 10; i++) {
    await new Promise(r => setTimeout(r, 2000));
    if (await apiResponde()) {
      console.log('  API lista (intento ' + i + ')');
      return;
    }
  }
  console.error('\n✗ La API no respondio en ' + BASE);
  detenerApi();
  process.exit(1);
}

function detenerApi() {
  if (apiProc) {
    apiProc.kill();
    apiProc = null;
  }
}

await asegurarApi();

let totalPasadas = 0, totalFalladas = 0, todosErrores = [];

async function correr(nombre, fn) {
  try {
    const { pasadas, falladas, errores } = await fn();
    totalPasadas += pasadas;
    totalFalladas += falladas;
    todosErrores.push(...errores);
    const icono = falladas === 0 ? '✓' : '✗';
    console.log('\n' + icono + ' ' + nombre + ':  ' + pasadas + ' pasaron  ' + falladas + ' fallaron');
  } catch (e) {
    console.error('\n✗ Error en ' + nombre + ': ' + e.message);
    totalFalladas++;
    todosErrores.push(nombre + ': ' + e.message);
  }
}

await correr('Productos',          suiteProductos);
await correr('Pedidos',            suitePedidos);
await correr('Contrato y Tiempo',  suiteContrato);

const duracion = ((Date.now() - inicio) / 1000).toFixed(2);

console.log('\n══════════════════════════════════════════════════════');
console.log('  RESULTADO FINAL');
console.log('  Total pasaron : ' + totalPasadas);
console.log('  Total fallaron: ' + totalFalladas);
console.log('  Duracion      : ' + duracion + 's');
console.log('══════════════════════════════════════════════════════');

// Guardar reporte JSON (lo usa el pipeline para artefactos)
const reporte = {
  fecha: new Date().toISOString(),
  duracionSegundos: Number(duracion),
  pasadas: totalPasadas,
  falladas: totalFalladas,
  exitCode: totalFalladas === 0 ? 0 : 1,
  errores: todosErrores
};
const rutaReporte = path.join(__dirname, '..', '4-pipeline', 'test-report.json');
fs.mkdirSync(path.dirname(rutaReporte), { recursive: true });
fs.writeFileSync(rutaReporte, JSON.stringify(reporte, null, 2));
console.log('  Reporte guardado en 4-pipeline/test-report.json');

// Apagar la API que levantamos (si la levantamos nosotros)
detenerApi();

if (totalFalladas > 0) {
  console.log('\n✗ BUILD FAILED - ' + totalFalladas + ' prueba(s) fallaron');
  console.log('  Errores:');
  todosErrores.forEach(e => console.log('    - ' + e));
  process.exit(1);
} else {
  console.log('\n✓ BUILD PASSED - todas las pruebas pasaron');
  process.exit(0);
}
