declare const stylusLoader: {
    name: string;
    process({ code }: {
        code: string;
    }): Promise<{
        code: string;
        map?: string;
    }>;
    test: RegExp;
};
export default stylusLoader;
