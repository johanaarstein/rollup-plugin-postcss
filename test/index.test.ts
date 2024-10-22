import path from 'path'
import fs from 'fs-extra'
import { rollup } from 'rollup'
import importSync from 'import-sync'
import postcss from '@/.'
import { PostCSSPluginConf } from '@/types'

process.env.ROLLUP_POSTCSS_TEST = 'true'
/**
 * solve jest timeout on Windows OS
 */
const JEST_TIMEOUT = process.platform === 'win32' ? 20000 : 5000

/**
 *
 */
function fixture(...args: string[]) {
  return path.join(__dirname, 'fixtures', ...args)
}

beforeAll(() => fs.remove(fixture('dist')))

/**
 *
 */
async function write({
  input,
  options,
  outDir,
}: {
  input: string
  options: PostCSSPluginConf
  outDir: string
}) {
  const { delayResolve, ...postCssOptions } = options

  let first = true
  // Delay the resolving of the first css file
  const lateResolve = {
    name: 'late-resolve',
    async resolveId(importee: string) {
      // when it's not a css file and not the first css file we return
      if (!first || !importee.endsWith('.css')) {
        return null
      }

      first = false

      // delay resolving
      return new Promise((resolve) => {
        setTimeout(() => resolve(null), 1000)
      })
    },
  }

  const _outDir = fixture('dist', outDir),
    bundle = await rollup({
      input: fixture(input),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      plugins: [postcss(postCssOptions), delayResolve && lateResolve].filter(
        Boolean
      ),
    })
  await bundle.write({
    file: path.join(_outDir, 'bundle.js'),
    format: 'cjs',
  })
  let cssCodePath = path.join(_outDir, 'bundle.css')
  if (typeof options.extract === 'string') {
    cssCodePath = path.isAbsolute(options.extract)
      ? options.extract
      : path.join(_outDir, options.extract)
  }

  const cssMapPath = `${cssCodePath}.map`,
    jsCodePath = path.join(_outDir, 'bundle.js')
  return {
    cssCode() {
      return fs.readFile(cssCodePath, 'utf8')
    },
    cssMap() {
      return fs.readFile(cssMapPath, 'utf8')
    },
    hasCssFile() {
      return fs.pathExists(cssCodePath)
    },
    hasCssMapFile() {
      return fs.pathExists(cssMapPath)
    },
    jsCode() {
      return fs.readFile(jsCodePath, 'utf8')
    },
  }
}

/**
 *
 */
function snapshot({
  input,
  options = {},
  outDir,
  title,
}: {
  input: string
  options?: PostCSSPluginConf
  outDir: string
  title: string
}) {
  test(
    title,
    async () => {
      let result
      try {
        result = await write({
          input,
          options,
          outDir,
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        const frame = error.codeFrame || error.snippet
        if (frame) {
          throw new Error(frame + error.message)
        }

        throw error
      }

      expect(await result.jsCode()).toMatchSnapshot('js code')

      if (options.extract) {
        expect(await result.hasCssFile()).toBe(true)
        expect(await result.cssCode()).toMatchSnapshot('css code')
      }

      const sourceMap = options && options.sourceMap
      if (sourceMap === 'inline') {
        expect(await result.hasCssMapFile()).toBe(false)
      } else if (sourceMap === true) {
        expect(await result.hasCssMapFile()).toBe(Boolean(options.extract))
        if (options.extract) {
          expect(await result.cssMap()).toMatchSnapshot('css map')
        }
      }
    },
    JEST_TIMEOUT
  )
}

/**
 *
 */
function snapshotMany(
  title: string,
  tests: { input: string; title: string; options?: PostCSSPluginConf }[]
) {
  describe(title, () => {
    for (const test of tests) {
      snapshot({
        ...test,
        outDir: `${title}--${test.title}`,
      })
    }
  })
}

snapshotMany('basic', [
  {
    input: 'simple/index.js',
    title: 'simple',
  },
  {
    input: 'postcss-config/index.js',
    title: 'postcss-config',
  },
  {
    input: 'skip-loader/index.js',
    options: {
      loaders: [
        {
          name: 'loader',
          process() {
            return 'lol'
          },
          test: /\.random$/,
        },
      ],
      use: ['loader'],
    },
    title: 'skip-loader',
  },
  {
    input: 'postcss-options/index.js',
    options: {
      plugins: [importSync('autoprefixer')()],
    },
    title: 'postcss-options',
  },
  {
    input: 'simple/index.js',
    options: {
      onImport: () => {},
    },
    title: 'on-import',
  },
])

snapshotMany('minimize', [
  {
    input: 'simple/index.js',
    options: {
      minimize: true,
    },
    title: 'inject',
  },
  {
    input: 'simple/index.js',
    options: {
      extract: true,
      minimize: true,
    },
    title: 'extract',
  },
  {
    input: 'simple/index.js',
    options: {
      extract: true,
      minimize: true,
      sourceMap: true,
    },
    title: 'extract-sourcemap-true',
  },
  {
    input: 'simple/index.js',
    options: {
      extract: true,
      minimize: true,
      sourceMap: 'inline',
    },
    title: 'extract-sourcemap-inline',
  },
])

snapshotMany('modules', [
  {
    input: 'css-modules/index.js',
    options: {
      modules: true,
    },
    title: 'inject',
  },
  {
    input: 'css-modules/index.js',
    options: {
      autoModules: false,
      modules: {
        getJSON() {
          //
        },
      },
    },
    title: 'inject-object',
  },
  {
    input: 'named-exports/index.js',
    options: {
      modules: true,
      namedExports: true,
    },
    title: 'named-exports',
  },
  {
    input: 'named-exports/index.js',
    options: {
      modules: true,
      namedExports(name) {
        return `${name}hacked`
      },
    },
    title: 'named-exports-custom-class-name',
  },
  {
    input: 'css-modules/index.js',
    options: {
      extract: true,
      modules: true,
    },
    title: 'extract',
  },
  {
    input: 'auto-modules/index.js',
    title: 'auto-modules',
  },
])

snapshotMany('sourcemap', [
  {
    input: 'simple/index.js',
    options: {
      sourceMap: true,
    },
    title: 'true',
  },
  // Is it broken?
  {
    input: 'simple/index.js',
    options: {
      sourceMap: 'inline',
    },
    title: 'inline',
  },
])

snapshotMany('extract', [
  {
    input: 'simple/index.js',
    options: {
      extract: true,
    },
    title: 'true',
  },
  {
    input: 'simple/index.js',
    options: {
      extract: fixture('dist/extract--custom-path/this/is/extracted.css'),
      sourceMap: true,
    },
    title: 'custom-path',
  },
  {
    input: 'simple/index.js',
    options: {
      extract: 'this/is/extracted.css',
      sourceMap: true,
    },
    title: 'relative-path',
  },
  {
    input: 'simple/index.js',
    options: {
      extract: true,
      sourceMap: true,
    },
    title: 'sourcemap-true',
  },
  {
    input: 'simple/index.js',
    options: {
      extract: true,
      sourceMap: 'inline',
    },
    title: 'sourcemap-inline',
  },
  {
    input: 'nested/index.js',
    options: {
      extract: true,
      sourceMap: 'inline',
    },
    title: 'nested',
  },
  {
    input: 'nested/index.js',
    options: {
      delayResolve: true,
      extract: true,
      sourceMap: 'inline',
    },
    title: 'nested-delay-resolve',
  },
])

snapshotMany('inject', [
  {
    input: 'simple/index.js',
    options: {
      inject: {
        insertAt: 'top',
      },
    },
    title: 'top',
  },
  {
    input: 'simple/index.js',
    options: {
      inject: (variableName) => `console.log(${variableName})`,
    },
    title: 'function',
  },
  {
    input: 'simple/index.js',
    options: {
      inject: false,
    },
    title: 'false',
  },
])

snapshotMany('sass', [
  {
    input: 'sass/index.js',
    title: 'default',
  },
  {
    input: 'sass/index.js',
    options: {
      sourceMap: true,
    },
    title: 'sourcemap',
  },
  {
    input: 'sass-modules/index.js',
    options: {
      modules: true,
    },
    title: 'modules',
  },
  {
    input: 'sass-data-prepend/index.js',
    options: {
      use: [['sass', { data: "@import 'prepend';" }]],
    },
    title: 'data-prepend',
  },
  {
    input: 'sass-data-prepend/index.js',
    options: {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      use: {
        sass: { data: "@import 'prepend';" },
      },
    },
    title: 'data-prepend',
  },
  {
    input: 'sass-import/index.js',
    title: 'import',
  },
])

test('onExtract', async () => {
  const result = await write({
    input: 'simple/index.js',
    options: {
      extract: true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      onExtract() {
        return false
      },
    },
    outDir: 'onExtract',
  })
  expect(await result.jsCode()).toMatchSnapshot()
  expect(await result.hasCssFile()).toBe(false)
})

test('augmentChunkHash', async () => {
  const outDir = fixture('dist', 'augmentChunkHash')
  const cssFiles = ['simple/foo.css', 'simple/foo.css', 'simple/bar.css']

  const outputFiles = []

  for (const file of cssFiles) {
    const newBundle = await rollup({
      input: fixture(file),
      plugins: [postcss({ extract: true })],
    })
    const entryFileName = file.split('.')[0]
    const { output } = await newBundle.write({
      dir: outDir,
      entryFileNames: `${entryFileName}.[hash].css`,
    })
    outputFiles.push(output[0])
  }

  const [fooOne, fooTwo, barOne] = outputFiles

  const fooHash = fooOne.fileName.split('.')[1]
  expect(fooHash).toBeTruthy() // Verify that [hash] part of `foo.[hash].css` is truthy
  expect(fooOne.fileName).toEqual(fooTwo.fileName) // Verify that the foo hashes to the same fileName

  const barHash = barOne.fileName.split('.')[1]
  expect(barHash).not.toEqual(fooHash) // Verify that foo and bar does not hash to the same
})
