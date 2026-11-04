// @ts-ignore
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'node:fs';

import config from 'config-vite';

import { mathBooksPlugin } from './vite-plugin-math-books.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mathLibraryRoot = path.resolve(
	__dirname,
	'../../../math-sdk/games/kong_club/library',
);

export default () => {
	const base = config();
	const pixiDist = path.resolve(__dirname, '../../packages/pixi-svelte/dist/index.js');
	const pixiSrc = path.resolve(__dirname, '../../packages/pixi-svelte/src/lib/index.ts');
	return {
		...base,
		resolve: {
			...base.resolve,
			alias: {
				...(base.resolve?.alias ?? {}),
				// dist is gitignored and the library vite config cannot build inside this app.
				// Source entry lets local dev resolve the workspace package.
				...(fs.existsSync(pixiDist) ? {} : { 'pixi-svelte': pixiSrc }),
			},
		},
		plugins: [...(base.plugins ?? []), mathBooksPlugin()],
		server: {
			...base.server,
			allowedHosts: true,
			fs: {
				...base.server?.fs,
				allow: [...(base.server?.fs?.allow ?? []), mathLibraryRoot],
			},
		},
	};
};
