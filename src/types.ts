import type { CreateFilter } from 'rollup-pluginutils'
import type { ConfigContext } from 'postcss-load-config'
import type { InputPluginOption, SourceMapInput } from 'rollup'
import sass from 'sass'
import stylus from 'stylus'
import less from 'less'

type FunctionType<T = unknown, U = unknown> = (...args: readonly T[]) => U

// export interface Bundle {
//   [x: string]: {
//     facadeModuleId: string
//     modules?: string[]
//   }
// }

export interface Context extends ConfigContext {
  file?: {
    basename: string
    dirname: string
    extname: string
  }
  options?: ConfigContext
}

// export interface Context {
//   id: string
//   sourceMap?: boolean | 'inline'
//   dependencies: Set<unknown>
// }

// export type MapObject =
//   | string
//   | boolean
//   | {
//       annotation: boolean
//       inline: boolean
//       mappings?: string
//       sources?: string[]
//     }

export interface Loader {
  name: string
  process({ code }?: { code: string }):
    | Promise<{
        code: string
        map?: SourceMapInput
      }>
    | string
  test?: ((x: string) => boolean) | RegExp
}

// export type Plugin = (x: unknown) => unknown

type Modules = 'sass' | 'stylus' | 'less'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Use = string[] | [Modules, any][] | { [key in Modules]: any }

export interface PostCSSPluginConf {
  autoModules?: boolean
  config?:
    | boolean
    | {
        path?: string
        ctx?: ConfigContext
      }
  delayResolve?: boolean
  exclude?: Parameters<CreateFilter>[1]
  exec?: boolean
  extensions?: string[]
  extract?: string | boolean
  include?: Parameters<CreateFilter>[0]
  inject?:
    | boolean
    | Record<string, unknown>
    | ((cssVariableName: string, id: string) => string)
  loaders?: Loader[]
  minimize?: boolean | unknown
  modules?: boolean | Record<string, unknown>
  name?: unknown[] | unknown[][]
  namedExports?: boolean | ((id: string) => string)
  onImport?: (id: string) => void
  onExtract?: (
    asset?: Readonly<{
      code: string
      map?: SourceMapInput
      codeFileName: string
      mapFileName: string
    }>
  ) => Promise<boolean>
  parser?: string | FunctionType
  plugins?: InputPluginOption
  to?: string
  sourceMap?: boolean | 'inline'
  stringifier?: string | FunctionType
  syntax?: string | FunctionType
  use?: Use
}

export type Sass = typeof sass
export type Stylus = typeof stylus
export type Less = typeof less
