// Hook PreToolUse del subagente coder.
// Bloquea que el coder edite pruebas, la bitácora ajena a su trabajo, archivos generados, la configuración de Claude
// o cualquier archivo fuera de este repositorio (la spec y el plan viven en ../core-bancario).
// Claude Code envía el evento como JSON por stdin; salir con código 2 bloquea la herramienta
// y el texto de stderr le llega al coder como motivo.
const path = require('path');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // Sin JSON válido no decidimos nada: sigue el flujo normal de permisos.
  }

  const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (!target) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const relative = path.relative(root, path.resolve(root, target)).split(path.sep).join('/');
  const lower = relative.toLowerCase();
  const segments = lower.split('/');

  // Dentro de construccion/ el coder solo puede llevar su avance y escribir sus notas de aprendizaje.
  const allowedInConstruccion = /^construccion\/[^/]+\/(avance|learning)\.md$/;

  const isOutside = relative.startsWith('..') || path.isAbsolute(relative);
  const isTest = /\.test\.tsx?$/.test(lower) || segments[0] === 'e2e' || lower.startsWith('src/pruebas/');
  const isConstruccion = segments[0] === 'construccion' && !allowedInConstruccion.test(lower);
  const isGenerated = segments[0] === 'contratos' || lower.startsWith('src/api/generado/');
  const isClaudeConfig = segments[0] === '.claude';

  if (isOutside || isTest || isConstruccion || isGenerated || isClaudeConfig) {
    process.stderr.write(
      `Bloqueado por el flujo SDD: el coder no puede modificar "${relative}". ` +
        'Si una prueba, la spec o el plan parecen incorrectos, no los cambies: ' +
        'detente y explícalo en tu respuesta final. Los contratos y los tipos generados ' +
        'solo cambian con npm run contratos:sincronizar y npm run tipos.',
    );
    process.exit(2);
  }

  process.exit(0);
});
