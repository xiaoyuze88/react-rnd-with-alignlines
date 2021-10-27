import commonjs from 'rollup-plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import resolve from 'rollup-plugin-node-resolve';
import builtins from 'rollup-plugin-node-builtins';
import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';

import pkg from './package.json';

export default {
	input: 'src/index.tsx',
	output: [
		{
			file: pkg.module,
			format: 'es',
		}
	],
	plugins: [
		typescript({
			tsconfig: 'tsconfig.json',
			exclude: ['*.d.ts', 'stories'],
		}),
		external(),
		postcss({
			plugins: []
		}),
		resolve({
			preferBuiltins: true
		}),
		builtins(),
		commonjs()
	]
};
