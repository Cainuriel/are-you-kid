import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		tailwindcss(), 
		sveltekit(),
		{
			name: 'configure-response-headers',
			configureServer: (server) => {
				server.middlewares.use((_req, res, next) => {
					res.setHeader('Cross-Origin-Embedder-Policy', 'cross-origin');
					res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
					next();
				});
			}
		},
		{
			name: 'buffer-polyfill',
			config() {
				return {
					define: {
						global: 'globalThis',
						'process.env.NODE_ENV': JSON.stringify('development'),
						Buffer: 'globalThis.Buffer'
					}
				};
			}
		}
	],
	optimizeDeps: { 
		include: [
			'@mattrglobal/bbs-signatures',
			'@noble/curves',
			'@noble/hashes',
			'@stablelib/random',
			'crypto-browserify',
			'stream-browserify',
			'buffer',
			'process',
			'util'
		]
	},
	ssr: {
		noExternal: [
			'@mattrglobal/bbs-signatures',
			'@noble/curves', 
			'@noble/hashes',
			'@stablelib/random'
		]
	},
	resolve: {
		alias: {
			crypto: resolve('./node_modules/crypto-browserify'),
			stream: resolve('./node_modules/stream-browserify'),
			buffer: resolve('./node_modules/buffer'),
			process: resolve('./node_modules/process'),
			util: resolve('./node_modules/util')
		}
	},
	build: {
		target: 'esnext',
		rollupOptions: {
			external: [],
			output: {
				manualChunks: {
					'crypto-libs': [
						'@mattrglobal/bbs-signatures',
						'@noble/curves',
						'@noble/hashes',
						'@stablelib/random'
					],
					'polyfills': [
						'buffer',
						'crypto-browserify',
						'stream-browserify',
						'process',
						'util'
					]
				}
			}
		}
	}
});
