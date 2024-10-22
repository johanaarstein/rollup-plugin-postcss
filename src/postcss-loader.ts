import path from 'path'
import importCwd from 'import-cwd'
import postcss from 'postcss'
import type { SourceMapInput } from 'rollup'
import findPostcssConfig from 'postcss-load-config'
import { identifier } from 'safe-identifier'
import type { ConfigContext } from 'postcss-load-config'
import { humanlizePath, normalizePath } from '@/utils'
import type { Context } from '@/types'

const styleInjectPath = require
  .resolve('style-inject/dist/style-inject.es')
  .replace(/[\\/]+/g, '/')

/**
 *
 */
function loadConfig(
  id: string,
  { ctx: configOptions, path: configPath }: { ctx: ConfigContext; path: string }
) {
  const handleError = (err: Error) => {
    if (!err.message.includes('No PostCSS Config found')) {
      throw err
    }

    // Return empty options for PostCSS
    return {}
  }

  const returnPath = configPath ? path.resolve(configPath) : path.dirname(id),
    ctx: Context = {
      file: {
        basename: path.basename(id),
        dirname: path.dirname(id),
        extname: path.extname(id),
      },
      options: configOptions || {},
    }

  return findPostcssConfig(ctx, returnPath).catch(handleError)
}

/**
 *
 */
function escapeClassNameDashes(str: string) {
  return str.replace(/-+/g, (match) => `$${match.replace(/-/g, '_')}$`)
}

/**
 *
 */
function ensureClassName(name: string) {
  const returnName = escapeClassNameDashes(name)
  return identifier(returnName, false)
}

/**
 *
 */
function ensurePostCSSOption(option: unknown) {
  return typeof option === 'string' ? importCwd(option) : option
}

/**
 *
 */
function isModuleFile(file: string) {
  return /\.module\.[a-z]{2,6}$/.test(file)
}

const postcssLoader = {
  alwaysProcess: true,
  name: 'postcss',

  // `test` option is dynamically set in ./loaders

  async process({ code, map }: { code: string; map?: string }): Promise<{
    code: string
    extracted?: {
      code: string
      id: string
      map: SourceMapInput
    }
    map?: SourceMapInput
  }> {
    // console.log('postcss-loader this:', this)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const config = this.options.config
        ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await loadConfig(this.id, this.options.config)
        : {},
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      { options } = this,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      plugins = [...(options.postcss.plugins || []), ...(config.plugins || [])],
      shouldExtract = options.extract,
      shouldInject = options.inject,
      modulesExported = {},
      autoModules =
        options.autoModules !== false && options.onlyModules !== true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      isAutoModule = autoModules && isModuleFile(this.id),
      supportModules = autoModules ? isAutoModule : options.modules
    if (supportModules) {
      const postcssModules = await import('postcss-modules')
      plugins.unshift(
        postcssModules.default({
          // In tests
          // Skip hash in names since css content on windows and linux would differ because of `new line` (\r?\n)
          generateScopedName: process.env.ROLLUP_POSTCSS_TEST
            ? '[name]_[local]'
            : '[name]_[local]__[hash:base64:5]',
          ...options.modules,
          getJSON(filepath, json, outpath) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            modulesExported[filepath] = json
            if (
              typeof options.modules === 'object' &&
              typeof options.modules.getJSON === 'function'
            ) {
              return options.modules.getJSON(filepath, json, outpath)
            }
          },
        })
      )
    }

    // If shouldExtract, minimize is done after all CSS are extracted to a file
    if (!shouldExtract && options.minimize) {
      const cssnano = await import('cssnano')
      plugins.push(cssnano.default)
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let optionsMap: SourceMapInput = false
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (this.sourceMap) {
      if (shouldExtract) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        optionsMap = { annotation: false, inline: false }
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        optionsMap = { annotation: false, inline: true }
      }
    }

    const postcssOptions = {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ...this.options.postcss,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ...config.options,
      // Followings are never modified by user config config
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      from: this.id,
      map: optionsMap,
      // Allow overriding `to` for some plugins that are relying on this value
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      to: options.to || this.id,
    }
    delete postcssOptions.plugins

    postcssOptions.parser = ensurePostCSSOption(postcssOptions.parser)
    postcssOptions.syntax = ensurePostCSSOption(postcssOptions.syntax)
    postcssOptions.stringifier = ensurePostCSSOption(postcssOptions.stringifier)

    if (map && postcssOptions.map) {
      postcssOptions.map.prev = typeof map === 'string' ? JSON.parse(map) : map
    }

    if (plugins.length === 0) {
      // Prevent from postcss warning:
      // You did not set any plugins, parser, or stringifier. Right now, PostCSS does nothing. Pick plugins for your case on https://www.postcss.parts/ and use them in postcss.config.js
      const noopPlugin = () => ({
        Once() {},
        postcssPlugin: 'postcss-noop-plugin',
      })

      plugins.push(noopPlugin())
    }

    const result = await postcss(plugins).process(code, postcssOptions)

    for (const message of result.messages) {
      if (message.type === 'dependency') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.dependencies.add(message.file)
      }
    }

    for (const warning of result.warnings()) {
      if (!('message' in warning)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line dot-notation
        warning['message'] = warning.text
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.warn(warning)
    }

    const outputMap = result.map && JSON.parse(result.map.toString())
    if (outputMap && outputMap.sources) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      outputMap.sources = outputMap.sources.map((val) => normalizePath(val))
    }

    let output = ''
    let extracted

    if (options.namedExports) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const json = modulesExported[this.id],
        getClassName =
          typeof options.namedExports === 'function'
            ? options.namedExports
            : ensureClassName

      for (const name in json) {
        const newName = getClassName(name)
        // Log transformed class names
        // But skip this when namedExports is a function
        // Since a user like you can manually log that if you want
        if (name !== newName && typeof options.namedExports !== 'function') {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.warn(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            `Exported "${name}" as "${newName}" in ${humanlizePath(this.id)}`
          )
        }

        if (!json[newName]) {
          json[newName] = json[name]
        }

        output += `export var ${newName} = ${JSON.stringify(json[name])};\n`
      }
    }

    const cssVariableName = identifier('css', true)
    if (shouldExtract) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      output += `export default ${JSON.stringify(modulesExported[this.id])};`
      extracted = {
        code: result.css,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        id: this.id,
        map: outputMap,
      }
    } else {
      const module = supportModules
        ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          JSON.stringify(modulesExported[this.id])
        : cssVariableName
      output +=
        `var ${cssVariableName} = ${JSON.stringify(result.css)};\n` +
        `export default ${module};\n` +
        `export var stylesheet=${JSON.stringify(result.css)};`
    }

    if (!shouldExtract && shouldInject) {
      output +=
        typeof options.inject === 'function'
          ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            options.inject(cssVariableName, this.id)
          : '\n' +
            `import styleInject from '${styleInjectPath}';\n` +
            `styleInject(${cssVariableName}${
              Object.keys(options.inject).length > 0
                ? `,${JSON.stringify(options.inject)}`
                : ''
            });`
    }

    return {
      code: output,
      extracted,
      map: outputMap,
    }
  },
}

export default postcssLoader
