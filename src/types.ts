import type { CreateFilter } from 'rollup-pluginutils'
import sass from 'sass'
import stylus from 'stylus'

type FunctionType<T = unknown, U = unknown> = (...args: readonly T[]) => U

export interface Bundle {
  [x: string]: {
    facadeModuleId: string
    modules?: string[]
  }
}

export interface Context {
  id: string
  sourceMap?: boolean | 'inline'
  dependencies: Set<unknown>
}

export interface Loader {
  name: string
  process({ code }: { code: string }): Promise<{
    code: string
    map?: string
  }>
  test?: ((x: string) => boolean) | RegExp
}

export type Plugin = (x: unknown) => unknown

export type Use = string[] | { [key in 'sass' | 'stylus' | 'less']: unknown }

export interface PostCSSPluginConf {
  autoModules?: boolean
  config?:
    | boolean
    | {
        path: string
        ctx: Context
      }
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
    asset: Readonly<{
      code: string
      map: string
      codeFileName: string
      mapFileName: string
    }>
  ) => boolean
  parser?: string | FunctionType
  plugins?: Plugin[]
  to?: string
  sourceMap?: boolean | 'inline'
  stringifier?: string | FunctionType
  syntax?: string | FunctionType
  use?: Use
}

export type Sass = typeof sass
export type Stylus = typeof stylus

/*

import { Plugin } from 'rollup'
import { CreateFilter } from 'rollup-pluginutils'

type FunctionType<T = any, U = any> = (...args: readonly T[]) => U;

type onExtract = (asset: Readonly<{
	code: any;
	map: any;
	codeFileName: string;
	mapFileName: string;
}>) => boolean;

export type PostCSSPluginConf = {
	inject?:
	| boolean
	| Record<string, any>
	| ((cssVariableName: string, id: string) => string);
	extract?: boolean | string;
	onExtract?: onExtract;
	modules?: boolean | Record<string, any>;
	extensions?: string[];
	plugins?: any[];
	autoModules?: boolean;
	namedExports?: boolean | ((id: string) => string);
	minimize?: boolean | any;
	parser?: string | FunctionType;
	stringifier?: string | FunctionType;
	syntax?: string | FunctionType;
	exec?: boolean;
	config?:
	| boolean
	| {
		path: string;
		ctx: any;
	};
	to?: string;
	name?: any[] | any[][];
	loaders?: any[];
	onImport?: (id: string) => void;
	use?: string[] | { [key in 'sass' | 'stylus' | 'less']: any };

sourceMap ?: boolean | 'inline';
include ?: Parameters < CreateFilter > [0];
exclude ?: Parameters < CreateFilter > [1];
};

export default function (options?: Readonly<PostCSSPluginConf>): Plugin

*/
