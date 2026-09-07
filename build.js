import esbuild from 'esbuild';

// Build ES Module bundle
await esbuild.build({
	entryPoints: ['src/index.js'],
	outfile: 'dist/snappysnippet.esm.js',
	bundle: true,
	format: 'esm',
	sourcemap: true,
	target: ['es2020']
});

// Build IIFE / Browser bundle (global window.SnappySnippet)
await esbuild.build({
	entryPoints: ['src/index.js'],
	outfile: 'dist/snappysnippet.js',
	bundle: true,
	format: 'iife',
	globalName: 'SnappySnippet',
	sourcemap: true,
	target: ['es2020']
});

console.log('Build completed successfully.');
