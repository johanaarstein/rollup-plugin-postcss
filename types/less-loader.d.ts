declare const lessLoader: {
    name: string;
    process({ code, }: {
        code: string;
    }): Promise<{
        code: string;
        map?: string;
    }>;
    test: RegExp;
};
export default lessLoader;
