import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'fs/promises'
import commonjs from '@rollup/plugin-commonjs'
import { dts } from 'rollup-plugin-dts'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { summary } from 'rollup-plugin-summary'
import { swc } from 'rollup-plugin-swc3'
import { typescriptPaths } from 'rollup-plugin-typescript-paths'

const __filename = fileURLToPath(import.meta.url),
  __dirname = path.dirname(__filename),
  pkg = JSON.parse(
    (
      await readFile(
        new URL(path.resolve(__dirname, 'package.json'), import.meta.url)
      )
    ).toString()
  ),
  types = {
    input: path.resolve(__dirname, 'types', 'index.d.ts'),
    output: {
      file: pkg.types,
      format: 'esm',
    },
    plugins: [dts()],
  },
  module = {
    external: Object.keys(pkg.dependencies),
    input: path.resolve(__dirname, 'src', 'index.ts'),
    onwarn(warning, warn) {
      if (
        warning.code === 'THIS_IS_UNDEFINED' ||
        warning.code === 'CIRCULAR_DEPENDENCY'
      ) {
        return
      }
      warn(warning)
    },
    output: [
      {
        exports: 'named',
        file: pkg.module,
        format: 'esm',
      },
      // {
      //   exports: 'named',
      //   file: pkg.exports['.'].require,
      //   format: 'cjs',
      // },
    ],
    plugins: [
      typescriptPaths(),
      nodeResolve({
        extensions: ['.ts'],
        preferBuiltins: true,
      }),
      commonjs(),
      swc(),
      summary(),
    ],
  }

export default [module, types]
