import type { SourceMapInput } from 'rollup';
declare const stylusLoader: {
    name: string;
    process({ code }: {
        code: string;
    }): Promise<{
        code: string;
        map?: SourceMapInput;
    }>;
    test: RegExp;
};
export default stylusLoader;
