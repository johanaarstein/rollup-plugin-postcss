import type { SourceMapInput } from 'rollup';
import type { Context, Loader, PostCSSPluginConf, Use } from './types';
export default class Loaders {
    constructor(options?: PostCSSPluginConf);
    protected loaders: Loader[];
    protected use: Use;
    registerLoader(loader: Loader): this;
    removeLoader(name: string): this;
    isSupported(filepath: string): boolean;
    process({ code, map }: {
        code: string;
        map?: SourceMapInput;
    }, context: Context): Promise<{
        code: string;
        map?: SourceMapInput;
        extracted: unknown;
    }>;
    getLoader(name: string): Loader | undefined;
}
