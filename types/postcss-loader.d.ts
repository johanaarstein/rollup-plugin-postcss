declare const postcssLoader: {
    alwaysProcess: boolean;
    name: string;
    process({ code, map }: {
        code: any;
        map: any;
    }): any;
};
export default postcssLoader;
