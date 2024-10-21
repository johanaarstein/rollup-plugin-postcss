declare const sassLoader: {
    name: string;
    process({ code, }: {
        code: string;
    }): Promise<{
        code: string;
        map?: string;
    }>;
    test: RegExp;
};
export default sassLoader;
