import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';

// Clean
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// Build main process
await esbuild.build({
  entryPoints: ['src/main/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: `${DIST}/main.js`,
  external: ['electron'],
  define: {
    'MAIN_WINDOW_VITE_DEV_SERVER_URL': 'undefined',
    'MAIN_WINDOW_VITE_NAME': 'undefined',
  },
});

// Build preload
await esbuild.build({
  entryPoints: ['src/renderer/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: `${DIST}/preload.js`,
  external: ['electron'],
});

// Build renderer JS
await esbuild.build({
  entryPoints: ['src/renderer/renderer.ts'],
  bundle: true,
  platform: 'browser',
  target: 'chrome120',
  format: 'iife',
  outfile: `${DIST}/renderer.js`,
});

// Copy CSS files
const overlayCss = fs.readFileSync('src/renderer/styles/overlay.css', 'utf-8');
const toolbarCss = fs.readFileSync('src/renderer/styles/toolbar.css', 'utf-8');

// Generate index.html with inlined CSS
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Screen Paint0r</title>
  <style>${overlayCss}\n${toolbarCss}</style>
</head>
<body>
  <div id="app"></div>
  <script src="./renderer.js"></script>
</body>
</html>`;

fs.writeFileSync(`${DIST}/index.html`, html);

console.log('Build complete → dist/');
