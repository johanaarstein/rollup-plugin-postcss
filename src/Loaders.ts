import path from 'path'
import series from '@/utils/promiseSeries'
import postcssLoader from '@/postcss-loader'
import sassLoader from '@/sass-loader'
import stylusLoader from '@/stylus-loader'
import lessLoader from '@/less-loader'
import type { Context, Loader, PostCSSPluginConf, Use } from '@/types'

const matchFile = (
  filepath: string,
  condition?: ((x: string) => boolean) | RegExp
) => {
  if (!condition) {
    return false
  }
  if (condition instanceof RegExp) {
    return condition && condition.test(filepath)
  }
  return condition(filepath)
}

export default class Loaders {
  constructor(options: PostCSSPluginConf = {}) {
    this.use =
      options.use?.map((rule) => {
        if (Array.isArray(rule)) {
          return rule
        }

        if (typeof rule === 'string') {
          return [rule]
        }

        throw new TypeError('The rule in `use` option must be string or Array!')
      }) || []
    this.loaders = []

    const extensions = options.extensions || ['.css', '.sss', '.pcss'],
      customPostcssLoader = {
        ...postcssLoader,
        test: (filepath: string) =>
          extensions.some((ext) => path.extname(filepath) === ext),
      }
    this.registerLoader(customPostcssLoader)
    this.registerLoader(sassLoader)
    this.registerLoader(stylusLoader)
    this.registerLoader(lessLoader)
    if (options.loaders) {
      for (const loader of options.loaders) {
        this.registerLoader(loader)
      }
    }
  }

  protected loaders: Loader[]
  protected use: Use

  public registerLoader(loader: Loader) {
    const existing = this.getLoader(loader.name)
    if (existing) {
      this.removeLoader(loader.name)
    }

    this.loaders.push(loader)
    return this
  }

  public removeLoader(name: string) {
    this.loaders = this.loaders.filter((loader: Loader) => loader.name !== name)
    return this
  }

  public isSupported(filepath: string) {
    return this.loaders.some((loader) => matchFile(filepath, loader.test))
  }

  /**
   * Process the resource with loaders in serial
   * @param {object} resource
   * @param {string} resource.code
   * @param {any} resource.map
   * @param {object} context
   * @param {string} context.id The absolute path to resource
   * @param {boolean | 'inline'} context.sourceMap
   * @param {Set<string>} context.dependencies A set of dependencies to watch
   * @returns {{code: string, map?: any}}
   */
  public async process(
    { code, map }: { code: string; map?: string },
    context: Context
  ): Promise<{
    code: string
    map?: { mappings: string }
    extracted: unknown
  }> {
    return series(
      this.use
        .slice()
        .reverse()
        .map(([name, options]) => {
          const loader = this.getLoader(name),
            loaderContext = {
              options: options || {},
              ...context,
            }

          return (val: { code: string; map: string }) => {
            if (
              loader &&
              (('alwaysProcess' in loader && loader.alwaysProcess) ||
                matchFile(loaderContext.id, loader.test))
            ) {
              return loader.process.call(loaderContext, val)
            }

            // Otherwise directly return input value
            return val
          }
        }),
      { code, map }
    )
  }

  public getLoader(name: string) {
    return this.loaders.find((loader) => loader.name === name)
  }
}
