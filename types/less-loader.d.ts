import type { SourceMapInput } from 'rollup';
declare const lessLoader: {
    name: string;
    process({ code, }: {
        code: string;
    }): Promise<{
        code: string;
        map?: SourceMapInput;
    }>;
    test: RegExp;
};
export default lessLoader;
