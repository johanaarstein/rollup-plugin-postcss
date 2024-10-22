import type { SourceMapInput } from 'rollup';
declare const postcssLoader: {
    alwaysProcess: boolean;
    name: string;
    process({ code, map }: {
        code: string;
        map?: string;
    }): Promise<{
        code: string;
        extracted?: {
            code: string;
            id: string;
            map: SourceMapInput;
        };
        map?: SourceMapInput;
    }>;
};
export default postcssLoader;
