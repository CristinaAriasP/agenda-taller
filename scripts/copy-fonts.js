// Copia las fuentes (Inter y JetBrains Mono, licencia OFL) desde node_modules a public/fonts,
// para servirlas desde la propia web en lugar de Google Fonts.
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'public', 'fonts');
fs.mkdirSync(out, { recursive: true });

const files = [
  ['@fontsource/inter', ['inter-latin-400-normal', 'inter-latin-500-normal', 'inter-latin-600-normal', 'inter-latin-700-normal']],
  ['@fontsource/jetbrains-mono', ['jetbrains-mono-latin-400-normal', 'jetbrains-mono-latin-500-normal']],
];
for (const [pkg, names] of files) {
  const dir = path.join(__dirname, '..', 'node_modules', pkg);
  for (const n of names) fs.copyFileSync(path.join(dir, 'files', `${n}.woff2`), path.join(out, `${n}.woff2`));
  fs.copyFileSync(path.join(dir, 'LICENSE'), path.join(out, `LICENSE-${path.basename(pkg)}.txt`));
}
console.log('Fuentes copiadas en public/fonts');
