import path from 'path'
import importCwd from 'import-cwd'
import postcss from 'postcss'
import findPostcssConfig from 'postcss-load-config'
import { identifier } from 'safe-identifier'
import humanlizePath from '@/utils/humanlize-path'
import normalizePath from '@/utils/normalize-path'

const styleInjectPath = require
  .resolve('style-inject/dist/style-inject.es')
  .replace(/[\\/]+/g, '/')

/**
 *
 */
function loadConfig(id: string, { ctx: configOptions, path: configPath }) {
  const handleError = (err: Error) => {
    if (!err.message.includes('No PostCSS Config found')) {
      throw err
    }

    // Return empty options for PostCSS
    return {}
  }

  configPath = configPath ? path.resolve(configPath) : path.dirname(id)
  const ctx = {
    file: {
      basename: path.basename(id),
      dirname: path.dirname(id),
      extname: path.extname(id),
    },
    options: configOptions || {},
  }

  return findPostcssConfig(ctx, configPath).catch(handleError)
}

/**
 *
 */
function escapeClassNameDashes(string) {
  return string.replace(/-+/g, (match) => `$${match.replace(/-/g, '_')}$`)
}

/**
 *
 */
function ensureClassName(name: string) {
  name = escapeClassNameDashes(name)
  return identifier(name, false)
}

/**
 *
 */
function ensurePostCSSOption(option) {
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

  async process({ code, map }) {
    const config = this.options.config
      ? await loadConfig(this.id, this.options.config)
      : {}

    const { options } = this
    const plugins = [
      ...(options.postcss.plugins || []),
      ...(config.plugins || []),
    ]
    const shouldExtract = options.extract
    const shouldInject = options.inject

    const modulesExported = {}
    const autoModules =
      options.autoModules !== false && options.onlyModules !== true
    const isAutoModule = autoModules && isModuleFile(this.id)
    const supportModules = autoModules ? isAutoModule : options.modules
    if (supportModules) {
      plugins.unshift(
        require('postcss-modules')({
          // In tests
          // Skip hash in names since css content on windows and linux would differ because of `new line` (\r?\n)
          generateScopedName: process.env.ROLLUP_POSTCSS_TEST
            ? '[name]_[local]'
            : '[name]_[local]__[hash:base64:5]',
          ...options.modules,
          getJSON(filepath, json, outpath) {
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
      plugins.push(require('cssnano')(options.minimize))
    }

    const postcssOptions = {
      ...this.options.postcss,
      ...config.options,
      // Followings are never modified by user config config
      from: this.id,
      map: this.sourceMap
        ? shouldExtract
          ? { annotation: false, inline: false }
          : { annotation: false, inline: true }
        : false,
      // Allow overriding `to` for some plugins that are relying on this value
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
        this.dependencies.add(message.file)
      }
    }

    for (const warning of result.warnings()) {
      if (!warning.message) {
        warning.message = warning.text
      }

      this.warn(warning)
    }

    const outputMap = result.map && JSON.parse(result.map.toString())
    if (outputMap && outputMap.sources) {
      outputMap.sources = outputMap.sources.map((v) => normalizePath(v))
    }

    let output = ''
    let extracted

    if (options.namedExports) {
      const json = modulesExported[this.id]
      const getClassName =
        typeof options.namedExports === 'function'
          ? options.namedExports
          : ensureClassName

      for (const name in json) {
        const newName = getClassName(name)
        // Log transformed class names
        // But skip this when namedExports is a function
        // Since a user like you can manually log that if you want
        if (name !== newName && typeof options.namedExports !== 'function') {
          this.warn(
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
      output += `export default ${JSON.stringify(modulesExported[this.id])};`
      extracted = {
        code: result.css,
        id: this.id,
        map: outputMap,
      }
    } else {
      const module = supportModules
        ? JSON.stringify(modulesExported[this.id])
        : cssVariableName
      output +=
        `var ${cssVariableName} = ${JSON.stringify(result.css)};\n` +
        `export default ${module};\n` +
        `export var stylesheet=${JSON.stringify(result.css)};`
    }

    if (!shouldExtract && shouldInject) {
      output +=
        typeof options.inject === 'function'
          ? options.inject(cssVariableName, this.id)
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
