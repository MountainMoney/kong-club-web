// @ts-ignore
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config from 'config-vite';

import { mathBooksPlugin } from './vite-plugin-math-books.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mathLibraryRoot = path.resolve(
	__dirname,
	'../../../math-sdk/games/monkey_mayhem/library',
);

export default () => {
	const base = config();
	return {
		...base,
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
