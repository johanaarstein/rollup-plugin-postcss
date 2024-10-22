import type { Less, Sass, Stylus } from './types';
export declare const humanlizePath: (filepath: string) => string, loadModule: (moduleId: string) => Less | Sass | Stylus, normalizePath: (path?: string) => string, series: (tasks: any[], initial?: any) => any;
