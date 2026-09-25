# Dia 2 - Automatizacion en AWS (servicio-tienda)

Proyecto de ejercicios de la **Sesion 2** (Certificacion 5 - QA Cloud-Native).
Un servicio de tienda (productos + pedidos) que recorre un pipeline CI/CD completo:
generar datos → levantar el servicio → correr tests → pipeline → analisis de seguridad.

> Idea central: **el pipeline no es una herramienta de DevOps, es una herramienta de CALIDAD.**
> Cada test que pones en el pipeline es una regla de negocio que nadie puede romper
> sin que el equipo lo sepa en minutos.

---

## Requisitos

- **Node.js v20 o superior** (`node --version`)
- Terminal **PowerShell** (Windows)

## Instalacion (una vez)

Desde esta carpeta (`servicio-tienda`):

```powershell
npm install
```

Instala `@faker-js/faker` (generar datos) y `json-server` (levantar la API).

---

## Estructura del proyecto (pasos enumerados)

Las carpetas estan numeradas en el ORDEN en que se usan durante la sesion:

```
servicio-tienda/
├── package.json            # scripts npm (ver abajo)
├── README.md               # este archivo
├── .gitignore              # ignora datos y reportes generados
│
├── 1-generar-datos/        # PASO 1: generar el dataset con Faker
│   └── generar-datos.js        # crea 2-servicio/db.seed.json (seed reproducible)
│
├── 2-servicio/             # PASO 2: el servicio bajo prueba (vacia al clonar)
│   ├── db.seed.json            # estado original (lo crea el paso 1, NO versionado)
│   └── db.json                 # copia de trabajo que lee la API (se genera en el paso 2)
│
├── 3-tests/                # PASO 3: las pruebas
│   ├── test-productos.js       # Suite 1: contrato + reglas de negocio + filtros
│   ├── test-pedidos.js         # Suite 2: contrato + ciclo CRUD
│   ├── test-contrato.js        # Suite 3: SLA <800ms, paginacion, busqueda, orden
│   └── runner.js               # orquesta las 3 suites, genera el reporte
│
├── 4-pipeline/             # PASO 4: el pipeline CI/CD
│   ├── buildspec.yml           # guion de AWS CodeBuild (5 fases, incl. security gate)
│   ├── runner-local.js         # ejecuta las 5 fases en Node (comando oficial)
│   ├── runner-local.ps1        # alternativa PowerShell (opcional)
│   ├── restaurar-seed.js       # copia db.seed.json -> db.json
│   └── test-report.json        # reporte de resultados (se genera)
│
└── 5-inspector/            # PASO 5: seguridad
    ├── reporte-inspector.json  # reporte de vulnerabilidades (simulado, CVEs reales)
    ├── analizar-reporte.js     # dashboard + score de riesgo + security gate
    └── resumen-analisis.json   # resumen accionable (se genera)
```

## Scripts npm disponibles

| Comando               | Paso | Que hace                                                     |
|-----------------------|------|--------------------------------------------------------------|
| `npm run generar`     | 1    | Faker genera `2-servicio/db.seed.json` (10 prod + 5 pedidos) |
| `npm run seed`        | 2    | Copia `db.seed.json` → `db.json` (estado limpio)             |
| `npm run api`         | 2    | Levanta json-server en http://localhost:3001                 |
| `npm test`            | 3    | Corre las 3 suites, genera `4-pipeline/test-report.json`     |
| `npm run test:productos` / `test:pedidos` / `test:contrato` | 3 | Una suite individual |
| `npm run pipeline`    | 4-5  | Ejecuta las 5 fases (BUILD + SECURITY_GATE informativo)      |
| `$env:SECURITY_GATE="on"; npm run pipeline` | 5 | Igual, pero el gate bloquea si el score es alto |
| `npm run inspector`   | 5    | Analiza el reporte de seguridad, calcula el score de riesgo  |

---

## PASO 1 - Generar los datos con Faker

```powershell
npm run generar
```

En vez de escribir el dataset a mano, lo generamos por codigo con Faker (igual que
en el Dia 1). Con `faker.seed(2025)` el resultado es **reproducible**: los mismos
datos en cada corrida, por eso los tests son deterministas. Deja un producto inactivo
con stock 0 a proposito (caso de borde). Escribe `2-servicio/db.seed.json` en el
formato que espera json-server: `{ "productos": [...], "pedidos": [...] }`.

## PASO 2 - Levantar el servicio

```powershell
npm run seed     # copia db.seed.json -> db.json (estado conocido)
npm run api      # levanta la API en http://localhost:3001
```

Prueba en el navegador: `http://localhost:3001/productos` y `http://localhost:3001/pedidos`.

## PASO 3 - Correr las pruebas

Con la API corriendo (en otra terminal):

```powershell
npm test
```

Corre 3 suites (186 aserciones en total): productos, pedidos y contrato/rendimiento.
Genera `4-pipeline/test-report.json` y sale con codigo 0 (OK) o 1 (fallo). Ese codigo
de salida es lo que el pipeline lee para saber si el build paso.

## PASO 4 - El pipeline completo

```powershell
npm run pipeline
```

Ejecuta las **5 fases** del `buildspec.yml` en tu maquina, sin depender de AWS:

1. **INSTALL** — `npm install`
2. **PRE_BUILD** — genera datos con Faker, restaura el seed, levanta la API, healthcheck
3. **BUILD** — corre `npm test` (186 aserciones)
4. **POST_BUILD** — muestra el reporte, detiene la API
5. **SECURITY_GATE** — corre el analisis de Inspector (`analizar-reporte.js`)

Termina en **PIPELINE PASSED** o en **BUILD/SECURITY GATE FAILED**. Es el mismo
`buildspec.yml` que usaria AWS CodeBuild en la nube.

**Reto — romper el build:** abre `2-servicio/db.json`, cambia el precio del producto 1
a `-99`, guarda y corre `npm run pipeline`. El build falla (precio no puede ser negativo).
Restaura con `npm run seed`.

## PASO 5 - El security gate (Inspector) dentro del pipeline

El analisis de seguridad **no es un paso aparte**: es la 5ta fase del mismo pipeline.
Puedes correr el analisis suelto o dentro del pipeline.

```powershell
npm run inspector          # el analisis suelto (solo el reporte)

npm run pipeline           # las 5 fases; el gate es INFORMATIVO (no bloquea)

$env:SECURITY_GATE="on"    # activa el gate como BLOQUEANTE
npm run pipeline           # ahora un score alto termina en SECURITY GATE FAILED
Remove-Item Env:\SECURITY_GATE   # vuelve a modo informativo
```

`analizar-reporte.js` lee `5-inspector/reporte-inspector.json` (12 hallazgos con CVEs
reales como Log4Shell) y produce: dashboard de severidades, lista priorizada, plan de
accion top 5, patrones detectados y un **score de riesgo**. Con el reporte de ejemplo el
score es **50** → supera el umbral de 25 → **DEPLOY BLOQUEADO** (exit 1).

La variable `SECURITY_GATE` (`off` por defecto, `on` para bloquear) controla si ese
exit 1 rompe el pipeline. Es un *security gate*: la seguridad usa el mismo mecanismo que
los tests funcionales — el pipeline devuelve exit 1 y el deploy no ocurre.

---

## Flujo rapido (todo de una vez)

```powershell
npm install
npm run generar     # Paso 1: Faker crea el dataset
npm run pipeline    # Pasos 2-5: seed + API + tests + security gate, todo en uno
```

## Que te llevas

- Un **servicio bajo prueba** con datos generados por Faker (reproducibles).
- Tres **suites de tests** que validan contrato, reglas de negocio y SLA.
- Un **pipeline CI/CD** con las 4 fases de CodeBuild, ejecutable en local.
- Un **security gate** con Inspector que puede bloquear el deploy por vulnerabilidades.
