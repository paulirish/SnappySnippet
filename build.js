import fs from 'node:fs';

let esbuild;
try {
  esbuild = await import('esbuild');
} catch {
  esbuild = await import('./lib/node_modules/esbuild/lib/main.js');
}

fs.mkdirSync('dist', { recursive: true });

const entryPoint = 'lib/src/index.ts';

await Promise.all([
  esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: 'dist/snappysnippet.esm.js',
    format: 'esm',
    target: 'es2022',
    sourcemap: true,
  }),
  esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: 'dist/snappysnippet.js',
    format: 'iife',
    globalName: 'SnappySnippet',
    target: 'es2022',
    sourcemap: true,
  }),
]);

console.log('Build completed: dist/snappysnippet.js & dist/snappysnippet.esm.js');
