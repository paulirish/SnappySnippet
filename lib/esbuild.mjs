import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['get-styles.ts'],
  bundle: true,
  outfile: 'get-styles.iife.js',
  format: 'iife',
  globalName: 'SnappySnippet',
});
