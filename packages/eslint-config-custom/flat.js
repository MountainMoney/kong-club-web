import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import turboConfig from 'eslint-config-turbo/flat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint v9 flat config for SvelteKit + TypeScript apps in this monorepo.
 * @param {{ svelteConfig?: import('@sveltejs/kit').Config, ignores?: string[] }} options
 */
export const createConfig = ({ svelteConfig, ignores = [] } = {}) => {
	return tseslint.config(
		js.configs.recommended,
		...tseslint.configs.recommended,
		...svelte.configs.recommended,
		...turboConfig,
		eslintConfigPrettier,
		{
			ignores: [
				'**/*.cjs',
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/.svelte-kit/**',
				...ignores,
			],
		},
		{
			languageOptions: {
				globals: {
					...globals.browser,
					...globals.node,
				},
			},
		},
		{
			files: ['**/*.{ts,js,mjs,cjs}'],
			languageOptions: {
				parserOptions: {
					ecmaVersion: 'latest',
					sourceType: 'module',
				},
			},
		},
		{
			files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
			languageOptions: {
				parserOptions: {
					extraFileExtensions: ['.svelte'],
					parser: tseslint.parser,
					svelteConfig,
				},
			},
		},
	);
};

export default createConfig;
