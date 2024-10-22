import path from 'path'
import importCwd from 'import-cwd'
import importSync from 'import-sync'
import type { Less, Sass, Stylus } from '@/types'

export const humanlizePath = (filepath: string) =>
    normalizePath(path.relative(process.cwd(), filepath)),
  loadModule = (moduleId: string): Less | Sass | Stylus => {
    // Trying to load module normally (relative to plugin directory)
    try {
      return importSync(moduleId)
    } catch {
      // Ignore error
    }

    // Then, trying to load it relative to CWD
    return importCwd.silent(moduleId) as Sass | Stylus
  },
  normalizePath = (path?: string) => {
    if (path) {
      return path.replace(/\\+/g, '/')
    }
    return ''
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series = (tasks: any[], initial?: any) => {
    if (!Array.isArray(tasks)) {
      return Promise.reject(
        new TypeError('promise.series only accepts an array of functions')
      )
    }
    return tasks.reduce(
      (current, next) => current.then(next),
      Promise.resolve(initial)
    )
  }
