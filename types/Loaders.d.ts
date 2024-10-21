import type { Context, Loader, PostCSSPluginConf, Use } from '@/types';
export default class Loaders {
    constructor(options?: PostCSSPluginConf);
    protected loaders: Loader[];
    protected use: Use;
    registerLoader(loader: Loader): this;
    removeLoader(name: string): this;
    isSupported(filepath: string): boolean;
    process({ code, map }: {
        code: string;
        map?: string;
    }, context: Context): Promise<{
        code: string;
        map?: {
            mappings: string;
        };
        extracted: unknown;
    }>;
    getLoader(name: string): Loader | undefined;
}
