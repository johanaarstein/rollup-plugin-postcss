import path from 'path'
import { createFilter } from 'rollup-pluginutils'
import Concat from 'concat-with-sourcemaps'
import Loaders from '@/Loaders'
import normalizePath from '@/utils/normalize-path'
import type { Bundle, PostCSSPluginConf } from '@/types'

/**
 * The options that could be `boolean` or `object`
 * We convert it to an object when it's truthy
 * Otherwise fallback to default value
 */
function inferOption<T>(option: T, defaultValue: T) {
  if (option === false) {
    return false
  }
  if (option && typeof option === 'object') {
    return option
  }
  return option ? {} : defaultValue
}

/**
 * Recursively get the correct import order from rollup
 * We only process a file once
 *
 * @param {string} id
 * @param {Function} getModuleInfo
 * @param {Set<string>} seen
 */
function getRecursiveImportOrder(
  id: string,
  getModuleInfo: (id: string) => { importedIds: [] },
  seen = new Set()
) {
  if (seen.has(id)) {
    return []
  }

  seen.add(id)

  const result = [id]
  for (const importFile of getModuleInfo(id).importedIds) {
    result.push(...getRecursiveImportOrder(importFile, getModuleInfo, seen))
  }

  return result
}

const postCSS = (options: PostCSSPluginConf = {}) => {
  const filter = createFilter(options.include, options.exclude)
  const postcssPlugins = Array.isArray(options.plugins)
    ? options.plugins.filter(Boolean)
    : options.plugins
  const { sourceMap } = options,
    postcssLoaderOptions = {
      /** Automatically CSS modules for .module.xxx files */
      autoModules: options.autoModules,
      /** Postcss config file */
      config: inferOption(options.config, {}),
      /** Extract CSS */
      extract: typeof options.extract === 'undefined' ? false : options.extract,
      /** Inject CSS as `<style>` to `<head>` */
      inject:
        typeof options.inject === 'function'
          ? options.inject
          : inferOption(options.inject, {}),
      /** Options for cssnano */
      minimize: inferOption(options.minimize, false),
      modules: inferOption(options.modules, false),
      namedExports: options.namedExports,
      /** CSS modules */
      onlyModules: options.modules === true,
      /** PostCSS options */
      postcss: {
        exec: options.exec,
        parser: options.parser,
        plugins: postcssPlugins,
        stringifier: options.stringifier,
        syntax: options.syntax,
      },
      /** PostCSS target filename hint, for plugins that are relying on it */
      to: options.to,
    }
  let use = ['sass', 'stylus', 'less']
  if (Array.isArray(options.use)) {
    use = options.use
  } else if (options.use !== null && typeof options.use === 'object') {
    use = [
      ['sass', options.use.sass || {}],
      ['stylus', options.use.stylus || {}],
      ['less', options.use.less || {}],
    ]
  }

  use.unshift(['postcss', postcssLoaderOptions])

  const loaders = new Loaders({
    extensions: options.extensions,
    loaders: options.loaders,
    use,
  })

  const extracted = new Map()

  return {
    augmentChunkHash() {
      if (extracted.size === 0) {
        return
      }
      const extractedValue = [...extracted].reduce(
        (object, [key, value]) => ({
          ...object,
          [key]: value,
        }),
        {}
      )
      return JSON.stringify(extractedValue)
    },

    async generateBundle(
      options_: {
        dir?: string
        file?: string
      },
      bundle: Bundle
    ) {
      if (extracted.size === 0 || !(options_.dir || options_.file)) {
        return
      }

      // TODO: support `[hash]`
      const dir = options_.dir || path.dirname(options_.file || ''),
        file =
          options_.file ||
          path.join(
            options_.dir || '',
            // TODO:
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            Object.keys(bundle).find((fileName) => bundle[fileName].isEntry)
          )
      const getExtracted = () => {
        let fileName = `${path.basename(file, path.extname(file))}.css`
        if (typeof postcssLoaderOptions.extract === 'string') {
          fileName = path.isAbsolute(postcssLoaderOptions.extract)
            ? normalizePath(path.relative(dir, postcssLoaderOptions.extract))
            : normalizePath(postcssLoaderOptions.extract)
        }

        const concat = new Concat(true, fileName, '\n'),
          entries = [...extracted.values()],
          { facadeModuleId, modules } =
            bundle[normalizePath(path.relative(dir, file))]

        if (modules) {
          const moduleIds = getRecursiveImportOrder(
            facadeModuleId,
            this.getModuleInfo
          )
          entries.sort(
            (a, b) => moduleIds.indexOf(a.id) - moduleIds.indexOf(b.id)
          )
        }

        for (const result of entries) {
          const relative = normalizePath(path.relative(dir, result.id)),
            map = result.map || null
          if (map) {
            map.file = fileName
          }

          concat.add(relative, result.code, map)
        }

        let code = concat.content.toString()

        if (sourceMap === 'inline') {
          code += `\n/*# sourceMappingURL=data:application/json;base64,${Buffer.from(
            concat.sourceMap,
            'utf8'
          ).toString('base64')}*/`
        } else if (sourceMap === true) {
          code += `\n/*# sourceMappingURL=${path.basename(fileName)}.map */`
        }

        return {
          code,
          codeFileName: fileName,
          map: sourceMap === true && concat.sourceMap,
          mapFileName: `${fileName}.map`,
        }
      }

      if (options.onExtract) {
        const shouldExtract = await options.onExtract(getExtracted)
        if (shouldExtract === false) {
          return
        }
      }

      // let { code, codeFileName, map, mapFileName } = getExtracted()
      const extracted = getExtracted()
      // Perform cssnano on the extracted file
      if (postcssLoaderOptions.minimize) {
        const cssOptions: {
          from?: string
          map?: {
            inline?: boolean
            prev?: string
          }
          to?: string
        } = {}
        cssOptions.from = extracted.codeFileName
        if (sourceMap === 'inline') {
          cssOptions.map = { inline: true }
        } else if (sourceMap === true && extracted.map) {
          cssOptions.map = { prev: extracted.map }
          cssOptions.to = extracted.codeFileName
        }

        const cssnano = await import('cssnano'),
          result = await cssnano.default().process(extracted.code, cssOptions)
        extracted.code = result.css

        if (sourceMap === true && result.map && result.map.toString) {
          extracted.map = result.map.toString()
        }
      }

      this.emitFile({
        fileName: extracted.codeFileName,
        source: extracted.code,
        type: 'asset',
      })
      if (extracted.map) {
        this.emitFile({
          fileName: extracted.mapFileName,
          source: extracted.map,
          type: 'asset',
        })
      }
    },

    name: 'postcss',

    async transform(code: string, id: string) {
      if (!filter(id) || !loaders.isSupported(id)) {
        return null
      }

      if (typeof options.onImport === 'function') {
        options.onImport(id)
      }

      const loaderContext = {
        dependencies: new Set(),
        id,
        plugin: this,
        sourceMap,
        warn: this.warn.bind(this),
      }

      const result = await loaders.process(
        {
          code,
          map: undefined,
        },
        loaderContext
      )

      for (const dep of loaderContext.dependencies) {
        this.addWatchFile(dep)
      }

      if (postcssLoaderOptions.extract) {
        extracted.set(id, result.extracted)
        return {
          code: result.code,
          map: { mappings: '' },
        }
      }

      return {
        code: result.code,
        map: result.map || { mappings: '' },
      }
    },
  }
}

export default postCSS
