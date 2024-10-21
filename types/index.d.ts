import type { Bundle, PostCSSPluginConf } from '@/types';
declare const postCSS: (options?: PostCSSPluginConf) => {
    augmentChunkHash(): string | undefined;
    generateBundle(options_: {
        dir?: string;
        file?: string;
    }, bundle: Bundle): Promise<void>;
    name: string;
    transform(code: string, id: string): Promise<{
        code: string;
        map: {
            mappings: string;
        };
    } | null>;
};
export default postCSS;
