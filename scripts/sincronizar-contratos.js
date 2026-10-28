// Copia los contratos OpenAPI versionados en core-bancario (ADR-0005, ADR-0022) a contratos/.
// El origen se puede cambiar con CORE_BANCARIO_DIR; por defecto es el repositorio hermano ../core-bancario.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origen = resolve(raiz, process.env.CORE_BANCARIO_DIR ?? '../core-bancario');

const contratos = [
  ['src/CoreBancario.Api/openapi/core-bancario-api.json', 'contratos/core-bancario-api.json'],
  ['src/CoreBancario.Bff/openapi/core-bancario-bff.json', 'contratos/core-bancario-bff.json'],
];

mkdirSync(resolve(raiz, 'contratos'), { recursive: true });
for (const [desde, hasta] of contratos) {
  const archivo = resolve(origen, desde);
  if (!existsSync(archivo)) {
    console.error(`No existe ${archivo}. Clona core-bancario al lado de este repositorio o define CORE_BANCARIO_DIR.`);
    process.exit(1);
  }
  copyFileSync(archivo, resolve(raiz, hasta));
  console.log(`${desde} -> ${hasta}`);
}
